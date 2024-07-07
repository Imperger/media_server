import * as path from 'path';

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { FileAccessService } from './file-access.service';
import { FolderAccessService } from './folder-access.service';
import { File } from './schemas/file.schema';

import { FSHelper } from '@/lib/FSHelper';
import { PathHelper } from '@/lib/PathHelper';
import { SyncProgressDecoratorService } from '@/live-feed/sync-progress-decorator.service';

interface FolderInitState {
  path: string;
  files: number;
}

@Injectable()
export class FileSyncService {
  constructor(
    @Inject('DB')
    private db: BetterSQLite3Database<{
      File: typeof File;
    }>,
    @Inject(forwardRef(() => FileAccessService))
    private readonly fileAccess: FileAccessService,
    @Inject(forwardRef(() => FolderAccessService))
    private readonly folderAccess: FolderAccessService,
    private readonly syncProgressDecorator: SyncProgressDecoratorService
  ) {}

  async syncFolder(
    collectionId: number,
    absolutePath: string
  ): Promise<number> {
    const syncStartTime = Date.now();

    await this.folderAccess.removeRecordWithChilds(
      PathHelper.relativeToMedia(absolutePath)
    );

    const completePromise = this.syncProgressDecorator.onInit(collectionId);

    const syncedBefore = await this.fileCountInFolder(absolutePath);

    let syncedNow = 0;
    const presyncState = await this.folderPresyncState(absolutePath);
    let totalSize = 0;
    const currentFolder = {
      path: path.parse(presyncState.path).dir,
      size: 0,
      files: 0
    };
    for await (const filename of FSHelper.EnumerateFiles(absolutePath)) {
      if (!this.isSupportedFileType(filename)) {
        continue;
      }

      const relativeToMedia = PathHelper.relativeToMedia(filename);

      const sizeBeforeSync =
        (await this.fileAccess.findFileByFilename(relativeToMedia))?.size ?? -1;

      const file = await this.fileAccess.create(relativeToMedia);

      if (file === null) {
        continue;
      }

      if (PathHelper.isFileInFolder(relativeToMedia, currentFolder.path)) {
        currentFolder.size += file.size;
        ++currentFolder.files;
      } else {
        await this.folderAccess.createAndUpdateParent(
          PathHelper.relativeToMedia(absolutePath),
          currentFolder.path,
          currentFolder.size,
          currentFolder.files
        );

        currentFolder.path = path.parse(relativeToMedia).dir;
        currentFolder.size = file.size;
        currentFolder.files = 1;
      }

      if (sizeBeforeSync !== file.size) {
        await this.fileAccess.generateAssets(file);
      }

      totalSize += file.size;
      ++syncedNow;

      this.syncProgressDecorator.onProgress(
        collectionId,
        totalSize,
        syncedNow / presyncState.files
      );
    }

    await this.syncProgressDecorator.onComplete(collectionId);

    await this.folderAccess.createAndUpdateParent(
      PathHelper.relativeToMedia(absolutePath),
      currentFolder.path,
      currentFolder.size,
      currentFolder.files
    );

    await this.disposeDanglingRecords(absolutePath, syncStartTime);

    await completePromise;

    return syncedNow - syncedBefore;
  }

  private async folderPresyncState(
    absolutePath: string
  ): Promise<FolderInitState> {
    const enumerator = FSHelper.EnumerateFiles(absolutePath);
    const path = PathHelper.relativeToMedia((await enumerator.next()).value);

    let files = +this.isSupportedFileType(path);
    for await (const filename of enumerator) {
      if (this.isSupportedFileType(filename)) {
        ++files;
      }
    }

    return { path, files };
  }

  async desyncFolder(absolutePath: string): Promise<void> {
    const relativeToMedia = PathHelper.relativeToMedia(absolutePath);
    const folderLike = `${relativeToMedia}%`;
    const filter = sql`${File.filename} like ${folderLike}`;

    await this.folderAccess.removeRecordWithChilds(relativeToMedia);

    while (true) {
      const file = await this.db
        .select({ id: File.id, filename: File.filename })
        .from(File)
        .where(filter)
        .limit(1);

      if (file.length === 0) {
        return;
      }

      await this.fileAccess.removeAssetsAssociatedWithFile(file[0].filename);
      await this.db.delete(File).where(eq(File.id, file[0].id));
    }
  }

  async fileCountInFolder(absolutePath: string): Promise<number> {
    const folderLike = `${PathHelper.relativeToMedia(absolutePath)}%`;
    const filter = sql`${File.filename} like ${folderLike}`;

    return (
      await this.db.select({ count: count() }).from(File).where(filter)
    )[0].count;
  }

  private async disposeDanglingRecords(
    absolutePath: string,
    syncStartTime: number
  ): Promise<number> {
    const folderLike = `${PathHelper.relativeToMedia(absolutePath)}%`;

    const danglingFiles = await this.db
      .select({ filename: File.filename })
      .from(File)
      .where(
        sql`${File.syncedAt} < ${syncStartTime} and ${File.filename} like ${folderLike}`
      );

    for (const dangling of danglingFiles) {
      await this.fileAccess.removeAssetsAssociatedWithFile(dangling.filename);
    }

    await this.db
      .delete(File)
      .where(
        sql`${File.syncedAt} < ${syncStartTime} and ${File.filename} like ${folderLike}`
      );

    return danglingFiles.length;
  }

  private isSupportedFileType(filename: string): boolean {
    const extname = path.extname(filename);
    return extname === '.mp4';
  }
}
