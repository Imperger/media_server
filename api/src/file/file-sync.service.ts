import * as path from 'path';
import { FSHelper } from '@/lib/FSHelper';
import { Inject, Injectable } from '@nestjs/common';
import { File } from './schemas/file.schema';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { count, eq, sql } from 'drizzle-orm';
import { FileAccessService } from './file-access.service';
import { PathHelper } from '@/lib/PathHelper';

@Injectable()
export class FileSyncService {
  constructor(
    @Inject('DB')
    private db: BetterSQLite3Database<{
      File: typeof File;
    }>,
    private readonly fileAccess: FileAccessService
  ) {}

  async syncFolder(absolutePath: string): Promise<number> {
    console.log(`syncFolder(${absolutePath})`);
    const syncStartTime = Date.now();

    const syncedBefore = await this.fileCountInFolder(absolutePath);

    let syncedNow = 0;
    for await (const filename of FSHelper.EnumerateFiles(absolutePath)) {
      if (!this.isSupportedFile(filename)) {
        continue;
      }

      const relativeToMedia = PathHelper.relativeToMedia(filename);

      const sizeBeforeSync =
        (await this.fileAccess.findFile(relativeToMedia))?.size ?? -1;

      const file = await this.fileAccess.create(relativeToMedia);

      if (file === null) {
        continue;
      }

      if (sizeBeforeSync !== file.size) {
        await this.fileAccess.generateAssets(file);
      }

      ++syncedNow;
    }

    await this.disposeDanglingRecords(absolutePath, syncStartTime);

    return syncedNow - syncedBefore;
  }

  async desyncFolder(absolutePath: string): Promise<void> {
    console.log(`desyncFolder(${absolutePath})`);
    const folderLike = `${PathHelper.relativeToMedia(absolutePath)}%`;
    const filter = sql`${File.filename} like ${folderLike}`;

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

  private isSupportedFile(filename: string): boolean {
    const extname = path.extname(filename);
    return extname === '.mp4';
  }
}
