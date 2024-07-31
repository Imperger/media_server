import { injectable } from 'inversify';

import { Inversify } from '@/inversify';
import { ContentCache, DownloadProgressListener } from '@/lib/content-cache';

export interface DownloadableMedia {
  mediaUrl: string;
  coverUrl: string;
}

interface DownloadStatus {
  mediaUrl: string;
  progress: number;
}

type Unsubscriber = () => void;

type VideoUrl = string;

@injectable()
export class DownloadManager {
  private readonly inProgress: DownloadStatus[] = [];
  private readonly listeners = new Map<VideoUrl, DownloadProgressListener[]>();

  async download(target: DownloadableMedia) {
    const status: DownloadStatus = {
      mediaUrl: target.mediaUrl,
      progress: 0
    };

    this.inProgress.push(status);

    try {
      await ContentCache.cacheFile(target.mediaUrl, (p) => {
        status.progress = p;
        this.broadcast(target.mediaUrl, status.progress);
      });
      await ContentCache.cacheFile(target.coverUrl);
    } catch (e) {
      console.error(`Failed to download '${target.mediaUrl}'`);
    } finally {
      this.broadcast(target.mediaUrl, 0);

      this.inProgress.splice(
        this.inProgress.findIndex((x) => x.mediaUrl === target.mediaUrl),
        1
      );
    }
  }

  async delete(target: DownloadableMedia): Promise<void> {
    await ContentCache.evictFile(target.mediaUrl);
    await ContentCache.evictFile(target.coverUrl);
  }

  /**
   * Subscribe to download progress.
   * When done, will call the listener with a value of 0
   * @param mediaUrl
   * @param downloadListener function will be called during downloading with progress in range [0 - 1]
   * @returns
   */
  subscribe(
    mediaUrl: string,
    downloadListener: DownloadProgressListener
  ): Unsubscriber {
    let targetListeners = this.listeners.get(mediaUrl);

    if (targetListeners === undefined) {
      targetListeners = [downloadListener];
      this.listeners.set(mediaUrl, targetListeners);
    } else {
      targetListeners.push(downloadListener);
    }

    const progress = this.progress(mediaUrl);

    if (progress >= 0) {
      downloadListener(progress);
    }

    return () =>
      targetListeners.splice(
        targetListeners.findIndex((x) => x === downloadListener),
        1
      );
  }

  progress(mediaUrl: string): number {
    const status = this.inProgress.find((x) => x.mediaUrl === mediaUrl);

    return status?.progress ?? -1;
  }

  broadcast(mediaUrl: string, progress: number): void {
    const targetListeners = this.listeners.get(mediaUrl);

    if (targetListeners !== undefined) {
      targetListeners.forEach((l) => l(progress));
    }
  }
}

Inversify.bind(DownloadManager).toSelf().inSingletonScope();
