import { Injectable } from '@nestjs/common';

import { ServerRefService } from './server-ref.service';

import type { TagStyle } from '@/meta-info/tag.service';

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

export interface AddTagEvent {
  type: 'add';
  name: string;
  style: TagStyle;
}

export interface RenameTagEvent {
  type: 'rename';
  oldName: string;
  newName: string;
}

export interface DeleteTagEvent {
  type: 'delete';
  name: string;
}

export type TagUpdateEvent = AddTagEvent | RenameTagEvent | DeleteTagEvent;

export interface AddGlobalTagEvent {
  type: 'add';
  name: string;
}

export interface RemoveGlobalTagEvent {
  type: 'remove';
  name: string;
}

export type GlobalTagUpdateEvent = AddGlobalTagEvent | RemoveGlobalTagEvent;

export interface AddFragmentTagEvent {
  type: 'add';
  name: string;
  begin: number;
  end: number;
  style: TagStyle;
}

export interface UpdateFragmentTagEvent {
  type: 'update';
  tag: string;
  begin?: number;
  end?: number;
}

export interface RemoveFragmentTagEvent {
  type: 'remove';
  name: string;
}

export type FragmentTagUpdateEvent =
  | AddFragmentTagEvent
  | UpdateFragmentTagEvent
  | RemoveFragmentTagEvent;

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
export class TagUpdateEmitter {
  constructor(private readonly serverRef: ServerRefService) {}

  boradcastUpdate(payload: TagUpdateEvent): void {
    this.serverRef.ref.to('tag.update').emit('tag.update', payload);
  }
}

@Injectable()
export class GlobalFileTagEmitter {
  constructor(private readonly serverRef: ServerRefService) {}

  boradcastUpdate(
    collectionId: number,
    filename: string,
    payload: GlobalTagUpdateEvent
  ): void {
    this.serverRef.ref
      .to(`tagFileGlobal.update_${collectionId}/${filename}`)
      .emit(`tagFileGlobal.update_${collectionId}/${filename}`, payload);
  }
}

@Injectable()
export class FragmentFileTagEmitter {
  constructor(private readonly serverRef: ServerRefService) {}

  boradcastUpdate(
    collectionId: number,
    filename: string,
    payload: FragmentTagUpdateEvent
  ): void {
    this.serverRef.ref
      .to(`tagFileFragment.update_${collectionId}/${filename}`)
      .emit(`tagFileFragment.update_${collectionId}/${filename}`, payload);
  }
}

@Injectable()
export class GlobalFolderTagEmitter {
  constructor(private readonly serverRef: ServerRefService) {}

  boradcastUpdate(
    collectionId: number,
    relativePath: string,
    payload: GlobalTagUpdateEvent
  ): void {
    this.serverRef.ref
      .to(`tagFolderGlobal.update_${collectionId}/${relativePath}`)
      .emit(`tagFolderGlobal.update_${collectionId}/${relativePath}`, payload);
  }
}

@Injectable()
export class LiveFeedService {
  constructor(
    public readonly FolderCollection: FolderCollectionEmitter,
    public readonly Tag: TagUpdateEmitter,
    public readonly GlobalFileTag: GlobalFileTagEmitter,
    public readonly FragmentFileTag: FragmentFileTagEmitter,
    public readonly GlobalFolderTag: GlobalFolderTagEmitter
  ) {}

  isValidEvent(event: string): event is LiveFeedEvent {
    return (
      [
        'folderCollection.syncProgress',
        'folderCollection.syncComplete',
        'tag.update'
      ].includes(event) ||
      event.startsWith('tagFileGlobal.update_') ||
      event.startsWith('tagFileFragment.update_') ||
      event.startsWith('tagFolderGlobal.update_')
    );
  }
}
