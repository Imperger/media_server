import axios, { AxiosInstance, isAxiosError } from 'axios';

export interface CreateCollectionResult {
  id: number;
  cover: string;
}

export interface CreateFolderCollectionResult extends CreateCollectionResult {
  syncedFiles: number;
}

export interface SyncFolderResult {
  syncedFiles: number;
}

export type CollectionType = 'folder' | 'view';

export interface CollectionRecord {
  id: number;
  type: CollectionType;
  caption: string;
  cover: string;
}

interface FileRecord {
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

  constructor(baseURL: string) {
    this.axios = axios.create({ baseURL });
  }

  async GetCollecionList(): Promise<CollectionRecord[]> {
    return (await this.axios.get<CollectionRecord[]>('collection')).data;
  }

  async CreateFolderCollection(
    caption: string,
    collectionId: string,
    folder: string
  ): Promise<CreateFolderCollectionResult> {
    return (
      await this.axios.post('collection-folder', {
        ...(caption.length > 0 && { caption }),
        collectionId,
        folder
      })
    ).data;
  }

  async RemoveCollectionFolder(id: number): Promise<void> {
    await this.axios.delete(`collection-folder/${id}`);
  }

  async syncFolder(id: number): Promise<SyncFolderResult> {
    return (await this.axios.patch<SyncFolderResult>(`collection-folder/${id}`))
      .data;
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

  async CreateViewCollection(
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
}
