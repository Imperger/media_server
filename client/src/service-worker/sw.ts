declare let self: ServiceWorkerGlobalScope;

import {
  createHandlerBoundToURL,
  cleanupOutdatedCaches,
  precacheAndRoute
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
