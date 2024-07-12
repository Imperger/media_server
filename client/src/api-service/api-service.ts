import axios, { AxiosInstance, isAxiosError } from 'axios';

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

export class ApiService {
  private readonly axios: AxiosInstance;
  public readonly liveFeed: LiveFeed;

  constructor(baseURL: string) {
    this.axios = axios.create({ baseURL });
    this.liveFeed = new LiveFeed();
  }

  async getCollecionList(): Promise<CollectionRecord[]> {
    return (await this.axios.get<CollectionRecord[]>('collection')).data;
  }

  async createFolderCollection(
    caption: string,
    collectionId: string,
    folder: string
  ): Promise<CreateCollectionResult> {
    return (
      await this.axios.post('collection-folder', {
        ...(caption.length > 0 && { caption }),
        collectionId,
        folder
      })
    ).data;
  }

  async removeCollectionFolder(id: number): Promise<void> {
    await this.axios.delete(`collection-folder/${id}`);
  }

  async syncFolder(id: number): Promise<void> {
    await this.axios.patch<SyncFolderResult>(`collection-folder/${id}`);
  }

  async folderInfo(id: number): Promise<FolderMetainfo> {
    return (
      await this.axios.get<FolderMetainfo>(`collection-folder/metainfo/${id}`)
    ).data;
  }

  async listFolderCollectionContent(
    collectionId: number,
    path: string
  ): Promise<FolderContentRecord[]> {
    return (
      await this.axios.get<FolderContentRecord[]>(
        `collection-folder/${collectionId}/${path}`
      )
    ).data;
  }

  async createViewCollection(
    _caption: string
  ): Promise<CreateCollectionResult> {
    return { id: -1, cover: '' };
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      await this.axios.delete(`file/${filename}`);
    } catch (e) {
      if (isAxiosError(e)) {
        return false;
      }
    }

    return true;
  }

  async deleteFolder(collectionId: number, path: string): Promise<boolean> {
    try {
      await this.axios.delete(`folder/${collectionId}/${path}`);
    } catch (e) {
      if (isAxiosError(e)) {
        return false;
      }
    }

    return true;
  }
}
