import { CachePrefix, CacheRuntime, CacheSuffix } from '../constants';

export type DownloadProgressListener = (progress: number) => void;

export class ContentCache {
  static get cacheName(): string {
    return `${CachePrefix}-${CacheRuntime}-${CacheSuffix}`;
  }
  static async cacheFile(
    url: string,
    listener: DownloadProgressListener
  ): Promise<void> {
    const response = await fetch(url);
    const cacheableResponse = response.clone();
    const contentLength = +response.headers.get('Content-Length')!;

    if (contentLength === 0) {
      console.warn(
        `Download progress listener for request '${url}' will not be called because of missing 'Content-Length' header`
      );
    }

    let receivedLength = 0;
    const reader = response.body!.getReader();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      receivedLength += value.length;

      if (contentLength !== 0) {
        listener(receivedLength / contentLength);
      }
    }

    const cache = await caches.open(ContentCache.cacheName);

    await cache.put(url, cacheableResponse);
  }

  static async evictFile(url: string): Promise<void> {
    const cache = await caches.open(ContentCache.cacheName);

    await cache.delete(url);
  }

  static async isCached(url: string): Promise<boolean> {
    const cache = await caches.open(ContentCache.cacheName);

    return (await cache.match(url)) !== undefined;
  }
}
