declare let self: ServiceWorkerGlobalScope & Window & typeof globalThis;

import {
  cacheNames,
  RouteMatchCallbackOptions,
  setCacheNameDetails
} from 'workbox-core';
import {
  createHandlerBoundToURL,
  cleanupOutdatedCaches,
  precacheAndRoute
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import {
  NetworkFirst,
  NetworkOnly,
  Strategy,
  StrategyHandler
} from 'workbox-strategies';

import {
  CacheGoogleAnalytics,
  CachePrecache,
  CachePrefix,
  CacheRuntime,
  CacheSuffix
} from '../constants';

type MyExtendableEvent = ExtendableEvent & { clientId?: string };

let isOnline: boolean | undefined;
let isOnlineFetchWaiterResolver: (() => void) | undefined;

async function checkIsOnline(e: MyExtendableEvent): Promise<boolean> {
  if (isOnline === undefined) {
    if (e.clientId === undefined) {
      throw new Error('Failed to obtain clientId');
    }

    const client = await self.clients.get(e.clientId);

    if (client === undefined) {
      throw new Error('Failed to locate tab');
    }

    const isOnlineFetchWaiter = new Promise<void>(
      (resolve) => (isOnlineFetchWaiterResolver = resolve)
    );

    client.postMessage({ type: 'getOnlineStatus' });

    await isOnlineFetchWaiter;

    return isOnline!;
  } else {
    return isOnline;
  }
}

class NetworkFirstWithAutoPrecaching extends Strategy {
  async _handle(
    request: Request,
    handler: StrategyHandler
  ): Promise<Response | undefined> {
    try {
      if (await checkIsOnline(handler.event)) {
        return await new NetworkFirst()._handle(request, handler);
      }

      const cache = await caches.open(cacheNames.runtime);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      } else {
        return new Response('Network and cache both failed', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

class NetworkFirstWithManualPrecaching extends Strategy {
  async _handle(
    request: Request,
    handler: StrategyHandler
  ): Promise<Response | undefined> {
    try {
      if (await checkIsOnline(handler.event)) {
        return await new NetworkOnly()._handle(request, handler);
      }

      const cache = await caches.open(cacheNames.runtime);

      const requestHandler =
        request.method === 'HEAD'
          ? (req: Request, cache: Cache) => this.handleHead(req, cache)
          : (req: Request, cache: Cache) => this.handleOther(req, cache);

      const cachedResponse = await requestHandler(request, cache);

      if (cachedResponse) {
        return cachedResponse;
      } else {
        return new Response('Network and cache both failed', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async handleHead(request: Request, cache: Cache): Promise<Response | null> {
    const cachedResponse = await cache.match(
      new Request(request.url, { method: 'GET' })
    );

    if (!cachedResponse) {
      return null;
    }

    return new Response(null, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: cachedResponse.headers
    });
  }

  async handleOther(request: Request, cache: Cache): Promise<Response | null> {
    const cachedResponse = await cache.match(request);

    if (!cachedResponse) {
      return null;
    }

    return cachedResponse;
  }
}

self.addEventListener('message', (e) => {
  switch (e.data.type) {
    case 'updateOnlineStatus':
      isOnline = e.data.isOnline;
      isOnlineFetchWaiterResolver && isOnlineFetchWaiterResolver();
      break;
  }
});

setCacheNameDetails({
  prefix: CachePrefix,
  suffix: CacheSuffix,
  precache: CachePrecache,
  runtime: CacheRuntime,
  googleAnalytics: CacheGoogleAnalytics
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

registerRoute(({ url }) => {
  const apiEdnpoints = [
    '/api/collection',
    '/api/collection-folder/metainfo/',
    '/api/collection-folder/immediate/',
    '/api/collection-folder/all/'
  ];

  return apiEdnpoints.some((endpoint) => url.pathname.startsWith(endpoint));
}, new NetworkFirstWithAutoPrecaching());

const contentUrlMatcher = ({ url }: RouteMatchCallbackOptions) => {
  const contentEndpoints = [
    '/api/file/content/',
    '/api/file/preview/',
    '/api/file/scrubbing/',
    '/api/folder/preview/'
  ];

  return contentEndpoints.some((endpoint) => url.pathname.startsWith(endpoint));
};

registerRoute(contentUrlMatcher, new NetworkFirstWithManualPrecaching(), 'GET');

registerRoute(
  contentUrlMatcher,
  new NetworkFirstWithManualPrecaching(),
  'HEAD'
);
