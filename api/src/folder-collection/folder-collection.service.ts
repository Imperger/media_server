import * as path from 'path';

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { CreateCollectionDto } from './dto/create-collection.dts';
import {
  InvalidFolderPathException,
  NonUniqueCollectionIdException,
  TooManySyncFolderException,
  UnknownFolderException
} from './exceptions';
import { FolderCollection } from './schemas/folder-collection.schema';

import {
  CollectionService,
  CreateCollectionResult
} from '@/collection/collection.service';
import { FileAccessService, FileRecord } from '@/file/file-access.service';
import { FileSyncService } from '@/file/file-sync.service';
import {
  FolderAccessService,
  FolderDescription
} from '@/file/folder-access.service';
import { FSHelper } from '@/lib/FSHelper';
import { PathHelper } from '@/lib/PathHelper';
import { Transaction } from '@/lib/Transaction';
import { LiveFeedService } from '@/live-feed/live-feed.service';

export interface FindFolderResult {
  id: number;
  collectionId: string;
  folder: string;
  syncedAt: number;
}

export interface FileRecordVariant extends FileRecord {
  type: 'file';
}

export interface FolderRecordVariant extends FolderDescription {
  type: 'folder';
}

export type FolderContentRecord = FileRecordVariant | FolderRecordVariant;

@Injectable()
export class FolderCollectionService {
  private syncInProgress: number[] = [];

  constructor(
    @Inject('DB')
    private db: BetterSQLite3Database<{
      CollectionFolder: typeof FolderCollection;
    }>,
    private readonly collectionService: CollectionService,
    private readonly fileSyncService: FileSyncService,
    private readonly fileAccessService: FileAccessService,
    private readonly folderAccess: FolderAccessService,
    private readonly liveFeed: LiveFeedService
  ) {}

  async CreateFolder(
    props: CreateCollectionDto
  ): Promise<CreateCollectionResult> {
    if (!(await FSHelper.isDirectory(props.folder))) {
      throw new InvalidFolderPathException();
    }

    const collection = await Transaction(this.db, async () => {
      const collection = await this.collectionService.CreateCollection(
        'folder',
        props.caption
      );

      if (
        !this.IsFolderInsideMedia(props.folder) ||
        (await this.IsFolderOverlapWithExising(props.folder))
      ) {
        throw new InvalidFolderPathException();
      }

      try {
        await this.db.insert(FolderCollection).values({
          id: collection.id,
          collectionId: props.collectionId,
          folder: props.folder,
          syncedAt: Date.now()
        });
      } catch (e) {
        throw new NonUniqueCollectionIdException();
      }

      return collection;
    });

    this.scheduleFolderSync(collection.id, props.folder);

    return { ...collection };
  }

  async RemoveFolder(id: number): Promise<boolean> {
    const collection = await this.FindFolder(id);

    if (collection !== null) {
      this.fileSyncService.desyncFolder(collection.folder);
    }

    return this.collectionService.RemoveCollection(id);
  }

  async FindFolder(collectionId: number): Promise<FindFolderResult | null> {
    const result = await this.db
      .select({
        id: FolderCollection.id,
        collectionId: FolderCollection.collectionId,
        folder: FolderCollection.folder,
        syncedAt: FolderCollection.syncedAt
      })
      .from(FolderCollection)
      .where(eq(FolderCollection.id, collectionId));

    return result[0] ?? null;
  }

  async syncFolder(id: number): Promise<void> {
    const timeout = 5000;
    const collection = await this.FindFolder(id);

    if (collection !== null) {
      if (
        Date.now() - collection.syncedAt <= timeout ||
        this.syncInProgress.indexOf(id) !== -1
      ) {
        throw new TooManySyncFolderException();
      }

      this.syncInProgress.push(id);

      await this.db
        .update(FolderCollection)
        .set({ syncedAt: Date.now() })
        .where(eq(FolderCollection.id, id));

      this.scheduleFolderSync(collection.id, collection.folder);
    }
  }

  async GetAllFolders(): Promise<string[]> {
    return this.db
      .select({ folder: FolderCollection.folder })
      .from(FolderCollection)
      .all()
      .map((x) => x.folder);
  }

  async listFolderContent(
    collectionId: number,
    relativePath: string
  ): Promise<FolderContentRecord[]> {
    const collection = await this.FindFolder(collectionId);

    if (collection === null) {
      throw new UnknownFolderException();
    }

    const collectionEntry = PathHelper.relativeToMedia(collection.folder);
    const targetFolder = path.join(collectionEntry, relativePath);

    const files = (
      await this.fileAccessService.list(targetFolder)
    ).map<FileRecordVariant>((x) => ({
      type: 'file',
      ...x,
      filename: `${collectionId}/${path.relative(collectionEntry, x.filename)}`
    }));

    const folders = (
      await this.folderAccess.list(targetFolder)
    ).map<FolderRecordVariant>((x) => ({ type: 'folder', ...x }));

    return [...files, ...folders];
  }

  private IsFolderInsideMedia(folder: string): boolean {
    const media = path.join(process.cwd(), 'media');

    return media === folder || PathHelper.isSubdirectory(media, folder);
  }

  private async IsFolderOverlapWithExising(folder: string): Promise<boolean> {
    return (await this.GetAllFolders()).some((x) =>
      PathHelper.IsPathsOverlap(x, folder)
    );
  }

  private scheduleFolderSync(collectionId: number, folder: string) {
    this.fileSyncService.syncFolder(collectionId, folder).then((addedFiles) => {
      this.syncInProgress.splice(this.syncInProgress.indexOf(collectionId), 1);
      this.liveFeed.FolderCollection.broadcastSyncComplete({
        id: collectionId,
        addedFiles
      });
    });
  }
}
