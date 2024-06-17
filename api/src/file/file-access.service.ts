import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { File } from './schemas/file.schema';
import { PathHelper } from '@/lib/PathHelper';
import { eq, sql } from 'drizzle-orm';
import { MediaToolService } from '@/media-tool/media-tool.service';
import { ReadStream, createReadStream } from 'fs';
import { FSHelper } from '@/lib/FSHelper';

export interface FileRecord {
  filename: string;
  size: number;
  width: number;
  height: number;
  duration: number;
  assetPrefix: string;
  createdAt: number;
}

export interface FolderRecord {
  name: string;
  assetPrefix: string;
}

@Injectable()
export class FileAccessService {
  constructor(
    @Inject('DB')
    private db: BetterSQLite3Database<{
      File: typeof File;
    }>,
    private readonly mediaTool: MediaToolService
  ) {}

  async create(filename: string): Promise<FileRecord | null> {
    try {
      const stat = await fs.stat(path.join(PathHelper.mediaEntry, filename));
      const metainfo = await this.mediaTool.videoMetainfo(filename);
      const shared = {
        size: stat.size,
        width: metainfo.width,
        height: metainfo.height,
        duration: metainfo.duration,
        createdAt: stat.birthtimeMs,
        syncedAt: Date.now()
      };

      await this.db
        .insert(File)
        .values({
          filename,
          depth: PathHelper.fileDepth(filename),
          ...shared
        })
        .onConflictDoUpdate({
          target: File.filename,
          set: shared
        });

      return { filename, assetPrefix: this.assetHash(filename), ...shared };
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  async remove(filename: string): Promise<boolean> {
    const deleted =
      (await this.db.delete(File).where(eq(File.filename, filename))).changes >
      0;

    try {
      await fs.unlink(path.join(PathHelper.mediaEntry, filename));
    } catch (e) {}

    return deleted;
  }

  async removeAssetsAssociatedWithFile(filename: string): Promise<void> {
    try {
      await fs.unlink(
        path.join(PathHelper.previewEntry, `${this.assetHash(filename)}.jpg`)
      );
    } catch (e) {}
  }

  async findFile(filename: string): Promise<FileRecord | null> {
    const file = (
      await this.db
        .select({
          filename: File.filename,
          size: File.size,
          width: File.width,
          height: File.height,
          duration: File.duration,
          createdAt: File.createdAt
        })
        .from(File)
        .where(eq(File.filename, filename))
    ).map((x) => ({ ...x, assetPrefix: this.assetHash(x.filename) }));

    return file.length > 0 ? file[0] : null;
  }

  /**
   * Retrieve files at specified path
   * @param path Example 'a', 'a/b'
   * @returns file list
   */
  async listFolderFiles(path: string): Promise<FileRecord[]> {
    let filter = '';
    if (path === '.') {
      path = '';
      filter = '%';
    } else {
      path += '/';
      filter = `${path}%`;
    }

    return (
      await this.db
        .select({
          filename: File.filename,
          size: File.size,
          width: File.width,
          height: File.height,
          duration: File.duration,
          createdAt: File.createdAt
        })
        .from(File)
        .where(
          sql`${File.filename} like ${filter} and ${File.depth} = ${PathHelper.fileDepth(path)}`
        )
    ).map((x) => ({ ...x, assetPrefix: this.assetHash(x.filename) }));
  }

  async listFolderFolders(relativePath: string): Promise<FolderRecord[]> {
    let filter = '';
    if (relativePath === '.') {
      relativePath = '';
      filter = '%';
    } else {
      relativePath += '/';
      filter = `${relativePath}%`;
    }

    // TODO This returns a lot of data, optimization needed
    const result = (
      await this.db
        .select({ filename: File.filename })
        .from(File)
        .where(
          sql`${File.filename} like ${filter} and ${File.depth} >= ${PathHelper.fileDepth(relativePath) + 1}`
        )
    ).map((x) => {
      let name = x.filename.substring(relativePath.length);
      name = name.substring(0, name.indexOf(path.sep));
      return { name, preview: x.filename };
    });

    const folders = new Map<string, string>();

    for (const record of result) {
      if (!folders.has(record.name)) {
        folders.set(record.name, this.assetHash(record.preview));
      }
    }

    return [...folders].map(([name, assetPrefix]) => ({
      name,
      assetPrefix
    }));
  }

  async generateAssets(file: FileRecord): Promise<boolean> {
    return this.mediaTool.generateAssets(file.filename, {
      previewTimepoint: Math.round(file.duration / 10),
      assetPrefix: this.assetHash(file.filename)
    });
  }

  async getPreviewStream(
    filename: string,
    fallbackFilename: string
  ): Promise<ReadStream> {
    const fullPath = path.join(PathHelper.previewEntry, filename);

    const fallbackPath = path.join(PathHelper.previewEntry, fallbackFilename);

    const src = (await FSHelper.exists(fullPath)) ? fullPath : fallbackPath;

    return createReadStream(src);
  }

  assetHash(filename: string): string {
    return crypto.createHash('md5').update(filename).digest('hex');
  }
}
