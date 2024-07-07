import { Injectable } from '@nestjs/common';

import { ServerRefService } from './server-ref.service';

export type LiveFeedEvent =
  | 'folderCollection.syncProgress'
  | 'folderCollection.syncComplete';

export interface FolderSyncProgress {
  id: number;
  size: number;
  progress: number; // [0 - 1]
  eta: number; // in seconds
}

export interface FolderSyncComplete {
  id: number;
  addedFiles: number;
}

@Injectable()
export class FolderCollectionEmitter {
  constructor(private readonly serverRef: ServerRefService) {}

  broadcastSyncProgress(payload: FolderSyncProgress[]): void {
    this.serverRef.ref
      .to('folderCollection.syncProgress')
      .emit('folderCollection.syncProgress', payload);
  }

  broadcastSyncComplete(payload: FolderSyncComplete): void {
    this.serverRef.ref
      .to('folderCollection.syncComplete')
      .emit('folderCollection.syncComplete', payload);
  }
}

@Injectable()
export class LiveFeedService {
  constructor(public readonly FolderCollection: FolderCollectionEmitter) {}

  isValidEvent(event: string): event is LiveFeedEvent {
    return [
      'folderCollection.syncProgress',
      'folderCollection.syncComplete'
    ].includes(event);
  }
}
