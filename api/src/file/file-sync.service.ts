import * as path from 'path';
import { FSHelper } from '@/lib/FSHelper';
import { Inject, Injectable } from '@nestjs/common';
import { File } from './schemas/file.schema';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { count, eq, sql } from 'drizzle-orm';
import { FileAccessService } from './file-access.service';
import { PathHelper } from '@/lib/PathHelper';
import { FolderAccessService } from './folder-access.service';

@Injectable()
export class FileSyncService {
  constructor(
    @Inject('DB')
    private db: BetterSQLite3Database<{
      File: typeof File;
    }>,
    private readonly fileAccess: FileAccessService,
    private readonly folderAccess: FolderAccessService
  ) {}

  async syncFolder(absolutePath: string): Promise<number> {
    console.log(`syncFolder(${absolutePath})`);

    const syncStartTime = Date.now();

    await this.folderAccess.removeRecordWithChilds(
      PathHelper.relativeToMedia(absolutePath)
    );
    const syncedBefore = await this.fileCountInFolder(absolutePath);

    let syncedNow = 0;
    const currentFolder = {
      path: path.parse(await this.initializeCurrentDir(absolutePath)).dir,
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

      ++syncedNow;
    }

    await this.folderAccess.createAndUpdateParent(
      PathHelper.relativeToMedia(absolutePath),
      currentFolder.path,
      currentFolder.size,
      currentFolder.files
    );

    await this.disposeDanglingRecords(absolutePath, syncStartTime);

    return syncedNow - syncedBefore;
  }

  private async initializeCurrentDir(absolutePath: string): Promise<string> {
    const enumerator = FSHelper.EnumerateFiles(absolutePath);
    const path = PathHelper.relativeToMedia((await enumerator.next()).value);

    // Explicitly destroy generator that owned dir handle to close it
    await enumerator.return(0);

    return path;
  }

  async desyncFolder(absolutePath: string): Promise<void> {
    console.log(`desyncFolder(${absolutePath})`);
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
