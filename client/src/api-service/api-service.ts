import { isAxiosError } from 'axios';
import { inject, injectable } from 'inversify';

import { Inversify } from '../inversify';

import { ClipAppService } from './clip-app-service';
import { HttpClient } from './http-client';
import { LiveFeed } from './live-feed';

export interface CreateCollectionResult {
  id: number;
  cover: string;
}

export interface SyncFolderResult {
  syncedFiles: number;
}

export type CollectionType = 'folder' | 'view';

interface CollectionBase {
  id: number;
  caption: string;
  cover: string;
}

export interface CollectionFolder extends CollectionBase {
  type: 'folder';
  size: number;
  syncProgress?: number;
  eta?: number; // in seconds
}

export interface CollectionView extends CollectionBase {
  type: 'view';
}

export type CollectionRecord = CollectionFolder | CollectionView;

export interface FileRecord {
  filename: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  assetPrefix: string;
  createdAt: number;
}
interface FolderRecord {
  name: string;
  size: number;
  files: number;
  assetPrefix: string;
}

export interface FileRecordVariant extends FileRecord {
  type: 'file';
}

export interface FolderRecordVariant extends FolderRecord {
  type: 'folder';
}

export type FolderContentRecord = FileRecordVariant | FolderRecordVariant;

export interface FolderMetainfo {
  collectionId: string;
  folder: string;
  syncedAt: number;
}

export interface RenameResultOk {
  success: true;
  assetPrefix: string;
}

export interface RenameResultFail {
  success: false;
}

export type RenameResult = RenameResultOk | RenameResultFail;

@injectable()
export class ApiService {
  public readonly liveFeed: LiveFeed;

  constructor(
    @inject(HttpClient) private readonly http: HttpClient,
    @inject(ClipAppService) public readonly clipApp: ClipAppService
  ) {
    this.liveFeed = new LiveFeed();
  }

  async getCollecionList(): Promise<CollectionRecord[]> {
    return (await this.http.get<CollectionRecord[]>('collection')).data;
  }

  async createFolderCollection(
    caption: string,
    collectionId: string,
    folder: string
  ): Promise<CreateCollectionResult> {
    return (
      await this.http.post<CreateCollectionResult>('collection-folder', {
        ...(caption.length > 0 && { caption }),
        collectionId,
        folder
      })
    ).data;
  }

  async removeCollectionFolder(id: number): Promise<void> {
    await this.http.delete(`collection-folder/${id}`);
  }

  async syncFolder(id: number): Promise<void> {
    await this.http.patch<SyncFolderResult>(`collection-folder/${id}`);
  }

  async folderInfo(id: number): Promise<FolderMetainfo> {
    return (
      await this.http.get<FolderMetainfo>(`collection-folder/metainfo/${id}`)
    ).data;
  }

  async listFolderCollectionContent(
    collectionId: number,
    path: string
  ): Promise<FolderContentRecord[]> {
    return (
      await this.http.get<FolderContentRecord[]>(
        `collection-folder/immediate/${collectionId}/${path}`
      )
    ).data;
  }

  async listFolderCollectionAllContent(
    collectionId: number,
    path: string
  ): Promise<FileRecordVariant[]> {
    return (
      await this.http.get<FileRecordVariant[]>(
        `collection-folder/all/${collectionId}/${path}`
      )
    ).data;
  }

  async createViewCollection(
    _caption: string
  ): Promise<CreateCollectionResult> {
    return { id: -1, cover: '' };
  }

  async renameFile(
    filename: string,
    newFilename: string
  ): Promise<RenameResult> {
    try {
      return (
        await this.http.patch<RenameResult>(`file/rename/${filename}`, {
          newFilename
        })
      ).data;
    } catch (e) {
      if (isAxiosError(e)) {
        return { success: false };
      }
    }

    return { success: false };
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      await this.http.delete(`file/${filename}`);
    } catch (e) {
      if (isAxiosError(e)) {
        return false;
      }
    }

    return true;
  }

  async deleteFolder(collectionId: number, path: string): Promise<boolean> {
    try {
      await this.http.delete(`folder/${collectionId}/${path}`);
    } catch (e) {
      if (isAxiosError(e)) {
        return false;
      }
    }

    return true;
  }
}

Inversify.bind(ApiService).toSelf().inSingletonScope();
