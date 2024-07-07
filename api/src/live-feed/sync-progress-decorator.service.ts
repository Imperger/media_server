import { Injectable } from '@nestjs/common';
import { Observable, Subject, throttleTime } from 'rxjs';

import { FolderSyncProgress, LiveFeedService } from './live-feed.service';

interface FolderSyncProgressExt extends FolderSyncProgress {
  timestamp: number;
}

@Injectable()
export class SyncProgressDecoratorService {
  private readonly foldersSyncProgress: FolderSyncProgressExt[] = [];
  private readonly syncProgressSignal: Subject<FolderSyncProgress[]>;
  private readonly syncProgressObservable: Observable<FolderSyncProgress[]>;

  constructor(private readonly liveFeed: LiveFeedService) {
    this.syncProgressSignal = new Subject<FolderSyncProgress[]>();

    this.syncProgressObservable = this.syncProgressSignal.pipe(
      throttleTime(1000, undefined, { leading: true, trailing: true })
    );

    this.syncProgressObservable.subscribe((x) =>
      this.liveFeed.FolderCollection.broadcastSyncProgress(
        x.map((x) => ({
          id: x.id,
          size: x.size,
          progress: x.progress,
          eta: x.eta
        }))
      )
    );
  }

  onInit(collectionId: number): Promise<void> {
    return new Promise((resolve) => {
      const syncProgressSubscription = this.syncProgressObservable.subscribe(
        (p) => {
          const progress = p.find((x) => x.id === collectionId);

          if (progress && progress.progress === 1) {
            resolve();
            syncProgressSubscription.unsubscribe();
          }
        }
      );
    });
  }

  onProgress(collectionId: number, totalSize: number, progress: number): void {
    const now = Date.now();

    const prev = this.foldersSyncProgress.find((x) => x.id === collectionId);

    this.updateProgressState({
      id: collectionId,
      size: totalSize,
      progress,
      eta: prev
        ? Math.round(
            ((now - prev.timestamp) / 1000 / (progress - prev.progress)) *
              (1 - progress)
          )
        : 0,
      timestamp: now
    });

    this.syncProgressSignal.next([...this.foldersSyncProgress]);
  }

  onComplete(collectionId: number): void {
    const progressToRemove = this.foldersSyncProgress.findIndex(
      (x) => x.id === collectionId
    );

    if (progressToRemove !== -1) {
      this.foldersSyncProgress.splice(progressToRemove, 1);
    }
  }

  private updateProgressState(item: FolderSyncProgressExt): void {
    const folderProgress = this.foldersSyncProgress.find(
      (x) => x.id === item.id
    );

    if (folderProgress) {
      folderProgress.size = item.size;
      folderProgress.progress = item.progress;
      folderProgress.eta = item.eta;
      folderProgress.timestamp = item.timestamp;
    } else {
      this.foldersSyncProgress.push(item);
    }
  }
}
