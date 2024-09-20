import { CachePrefix, CacheRuntime, CacheSuffix } from '../constants';

export type DownloadProgressListener = (progress: number) => void;

export interface MoveFileEntity {
  filename: string;
  assetPrefix: string;
}

export class ContentCache {
  static get cacheName(): string {
    return `${CachePrefix}-${CacheRuntime}-${CacheSuffix}`;
  }

  static async cacheFile(
    url: string,
    listener?: DownloadProgressListener
  ): Promise<void> {
    const response = await fetch(url);
    const cacheableResponse = response.clone();
    const contentLength = +response.headers.get('Content-Length')!;

    if (listener !== undefined && contentLength === 0) {
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

      if (listener !== undefined && contentLength !== 0) {
        listener(receivedLength / contentLength);
      }
    }

    const cache = await caches.open(ContentCache.cacheName);

    await cache.put(url, cacheableResponse);
  }

  static async moveFile(
    src: MoveFileEntity,
    dst: MoveFileEntity
  ): Promise<boolean> {
    const baseURL = import.meta.env.BASE_URL;
    const cache = await caches.open(ContentCache.cacheName);

    const mediaMoved = await ContentCache.moveEntity(
      cache,
      `${baseURL}api/file/content/${src.filename}`,
      `${baseURL}api/file/content/${dst.filename}`
    );

    const previewMoved = await ContentCache.moveEntity(
      cache,
      `${baseURL}api/file/preview/${src.assetPrefix}.jpg`,
      `${baseURL}api/file/preview/${dst.assetPrefix}.jpg`
    );

    const scrubbingMoved = await ContentCache.moveEntity(
      cache,
      `${baseURL}api/file/scrubbing/${src.assetPrefix}.jpg`,
      `${baseURL}api/file/scrubbing/${dst.assetPrefix}.jpg`
    );

    return mediaMoved && previewMoved && scrubbingMoved;
  }

  private static async moveEntity(
    cache: Cache,
    srcUrl: string,
    dstUrl: string
  ): Promise<boolean> {
    const response = await cache.match(encodeURI(srcUrl));

    if (response === undefined) {
      return false;
    }

    await cache.put(encodeURI(dstUrl), response);
    await cache.delete(encodeURI(srcUrl));

    return true;
  }

  static async evictFile(url: string): Promise<void> {
    const cache = await caches.open(ContentCache.cacheName);

    await cache.delete(url);
  }

  static async evictFolder(path: string): Promise<void> {
    const baseURL = import.meta.env.BASE_URL;

    const contentPathsToEvict = (
      await ContentCache.filterContent((x) => x.startsWith(path))
    ).map((x) => `${baseURL}api/file/content/${x}`);

    const assetPrefixes =
      await ContentCache.extractAssetPrefixes(contentPathsToEvict);

    if (assetPrefixes.length === 0) {
      return;
    }

    const cache = await caches.open(ContentCache.cacheName);

    for (const content of contentPathsToEvict) {
      await cache.delete(content);
    }

    for (const assetPrefix of assetPrefixes) {
      await cache.delete(`${baseURL}api/file/preview/${assetPrefix}.jpg`);
    }
  }

  /**
   * Throws away not cached urls
   * @param urls
   * @returns only cached urls
   */
  static async keep(urls: string[]): Promise<string[]> {
    const cache = await caches.open(ContentCache.cacheName);

    return (await Promise.all(urls.map((x) => cache.match(encodeURI(x)))))
      .filter((x) => x !== undefined)
      .map((x) => decodeURI(ContentCache.castToPathname(x)));
  }

  static async filterContent(
    pred: (filename: string) => boolean
  ): Promise<string[]> {
    const cache = await caches.open(ContentCache.cacheName);
    const keys = await cache.keys();

    return keys
      .map((x) => ContentCache.castToPathname(x))
      .filter((x) => ContentCache.isContentKey(x))
      .map((x) => ContentCache.contentPath(x))
      .filter((x) => pred(x));
  }

  static async filterPreview(
    pred: (filename: string) => boolean
  ): Promise<string[]> {
    const cache = await caches.open(ContentCache.cacheName);
    const keys = await cache.keys();

    return keys
      .map((x) => ContentCache.castToPathname(x))
      .filter((x) => ContentCache.isPreviewKey(x))
      .map((x) => ContentCache.contentPath(x))
      .filter((x) => pred(x));
  }

  static async extractAssetPrefixes(urls: string[]): Promise<string[]> {
    const cache = await caches.open(ContentCache.cacheName);

    const assetPrefixes: string[] = [];

    for (const url of urls) {
      const response = await cache.match(encodeURI(url));

      if (response === undefined) {
        continue;
      }

      const assetPrefixHeader = response.headers.get('Asset-Prefix');
      if (assetPrefixHeader !== null) {
        assetPrefixes.push(assetPrefixHeader);
      }
    }

    return assetPrefixes;
  }

  static async contentSize(): Promise<number> {
    const cache = await caches.open(ContentCache.cacheName);
    const keys = (await cache.keys())
      .map((x) => ContentCache.castToPathname(x))
      .filter(
        (x) => ContentCache.isContentKey(x) || ContentCache.isPreviewKey(x)
      );

    let size = 0;
    for (const key of keys) {
      const response = await cache.match(key);

      if (response === undefined) {
        continue;
      }

      const contentLength = response.headers.get('Content-Length');

      if (contentLength !== null) {
        size += Number.parseInt(contentLength);
      }
    }

    return size;
  }

  private static castToPathname(req: Request | Response): string {
    return new URL(req.url).pathname;
  }

  private static isContentKey(key: string): boolean {
    return key.startsWith('/api/file/content/');
  }

  private static contentPath(key: string): string {
    const pathnamePrefixLength = '/api/file/content/'.length;

    return decodeURI(key.slice(pathnamePrefixLength));
  }

  private static isPreviewKey(key: string): boolean {
    const previewPrefixes = ['/api/file/preview/', '/api/folder/preview/'];

    return previewPrefixes.some((x) => key.startsWith(x));
  }
}
