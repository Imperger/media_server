import { ReadStream, createReadStream } from 'fs';
import * as Fs from 'fs/promises';
import * as Path from 'path';

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { FileNotFoundException, PreviewNotFoundException } from './exceptions';
import { FolderAccessService } from './folder-access.service';
import { File } from './schemas/file.schema';

import { FolderCollectionService } from '@/folder-collection/folder-collection.service';
import { assetHash } from '@/lib/asset-hash';
import { FSHelper } from '@/lib/FSHelper';
import { PathHelper } from '@/lib/PathHelper';
import { MediaToolService } from '@/media-tool/media-tool.service';

export interface FileRecord {
  filename: string;
  size: number;
  width: number;
  height: number;
  duration: number;
  assetPrefix: string;
  createdAt: number;
}

export interface RangeOptions {
  start?: number;
  end?: number;
}

@Injectable()
export class FileAccessService {
  constructor(
    @Inject('DB')
    private db: BetterSQLite3Database<{
      File: typeof File;
    }>,
    private readonly mediaTool: MediaToolService,
    @Inject(forwardRef(() => FolderCollectionService))
    private folderCollection: FolderCollectionService,
    @Inject(forwardRef(() => FolderAccessService))
    private folderAccess: FolderAccessService
  ) {}

  async create(filename: string): Promise<FileRecord | null> {
    try {
      const stat = await Fs.stat(Path.join(PathHelper.mediaEntry, filename));
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

      return { filename, assetPrefix: assetHash(filename), ...shared };
    } catch (e) {
      return null;
    }
  }

  /**
   * Remove file from db and disk
   * @param filename relative to 'media'
   * @returns The file size if file was removed or -1 if not
   */
  async remove(filename: string): Promise<number> {
    const deleted = await this.db
      .delete(File)
      .where(eq(File.filename, filename))
      .returning({ size: File.size });

    try {
      await Fs.unlink(Path.join(PathHelper.mediaEntry, filename));
    } catch (e) {}

    return deleted.length > 0 ? deleted[0].size : -1;
  }

  /**
   * Rename file and returns new asset prefix
   * @param collectionId
   * @param relativeToCollectionPath
   * @param newFilename
   * @returns asset prefix or null if fail
   */
  async rename(
    collectionId: number,
    relativeToCollectionPath: string,
    newFilename: string
  ): Promise<string | null> {
    if (Path.basename(relativeToCollectionPath) === newFilename) {
      return null;
    }

    const collection = await this.folderCollection.FindFolder(collectionId);

    if (collection === null) {
      return null;
    }

    const relativeToMediaFilename = Path.join(
      PathHelper.relativeToMedia(collection.folder),
      relativeToCollectionPath
    );

    const relativeToMediaNewFilename = Path.join(
      Path.dirname(relativeToCollectionPath),
      newFilename
    );

    const absoluteFilename = Path.join(
      PathHelper.mediaEntry,
      relativeToMediaFilename
    );

    const absoluteNewFilename = Path.join(
      PathHelper.mediaEntry,
      relativeToMediaNewFilename
    );

    if (
      !(await FSHelper.exists(absoluteFilename)) ||
      (await FSHelper.exists(absoluteNewFilename))
    ) {
      return null;
    }

    const assetPrefix = assetHash(relativeToMediaFilename);
    const newAssetPrefix = assetHash(relativeToMediaNewFilename);

    await Fs.rename(absoluteFilename, absoluteNewFilename);

    await Fs.rename(
      Path.join(PathHelper.previewEntry, `${assetPrefix}.jpg`),
      Path.join(PathHelper.previewEntry, `${newAssetPrefix}.jpg`)
    );

    await Fs.rename(
      Path.join(PathHelper.scrubbingEntry, `${assetPrefix}.jpg`),
      Path.join(PathHelper.scrubbingEntry, `${newAssetPrefix}.jpg`)
    );

    try {
      const result = await this.db
        .update(File)
        .set({ filename: relativeToMediaNewFilename })
        .where(eq(File.filename, relativeToMediaFilename));

      return result.changes > 0 ? newAssetPrefix : null;
    } catch (e) {
      return null;
    }
  }

  async removeAssetsAssociatedWithFile(filename: string): Promise<void> {
    try {
      await Fs.unlink(
        Path.join(PathHelper.previewEntry, `${assetHash(filename)}.jpg`)
      );
      await Fs.unlink(
        Path.join(PathHelper.scrubbingEntry, `${assetHash(filename)}.jpg`)
      );
    } catch (e) {}
  }

  /**
   * Completely remove file with all related content
   * @param filename filename
   */
  async removeMediaByFilename(filename: string): Promise<number> {
    const removedSize = await this.remove(filename);
    if (removedSize !== -1) {
      await this.removeAssetsAssociatedWithFile(filename);
    } else {
      throw new FileNotFoundException();
    }

    return removedSize;
  }

  async removeMedia(
    collectionId: number,
    relativeToCollectionPath: string
  ): Promise<void> {
    const collection = await this.folderCollection.FindFolder(collectionId);

    if (collection === null) {
      throw new FileNotFoundException();
    }

    const collectionRoot = PathHelper.relativeToMedia(collection.folder);
    const filename = Path.join(collectionRoot, relativeToCollectionPath);

    const removedSize = await this.removeMediaByFilename(filename);

    await this.folderAccess.increaseStatAndUpdateParent(
      collectionRoot,
      PathHelper.fileFolder(filename),
      { size: -removedSize, files: -1 }
    );
  }

  async findFileByFilename(filename: string): Promise<FileRecord | null> {
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
    ).map((x) => ({ ...x, assetPrefix: assetHash(x.filename) }));

    return file.length > 0 ? file[0] : null;
  }

  async find(
    collectionId: number,
    relativeToCollectionPath: string
  ): Promise<FileRecord | null> {
    const collection = await this.folderCollection.FindFolder(collectionId);

    if (collection === null) {
      return null;
    }

    return this.findFileByFilename(
      Path.join(
        PathHelper.relativeToMedia(collection.folder),
        relativeToCollectionPath
      )
    );
  }

  /**
   * Retrieve files at specified path
   * @param path Example 'a', 'a/b'
   * @returns file list
   */
  async list(path: string): Promise<FileRecord[]> {
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
    ).map((x) => ({ ...x, assetPrefix: assetHash(x.filename) }));
  }

  /**
   * Retrieve files at specified path, includes subdirectories
   * @param path Example 'a', 'a/b'
   * @returns file list
   */
  async listIncludeSubdiretories(path: string): Promise<FileRecord[]> {
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
        .where(sql`${File.filename} like ${filter}`)
    ).map((x) => ({ ...x, assetPrefix: assetHash(x.filename) }));
  }

  async generateAssets(file: FileRecord): Promise<boolean> {
    return this.mediaTool.generateAssets(file.filename, {
      previewTimepoint: Math.round(file.duration / 10),
      assetPrefix: assetHash(file.filename)
    });
  }

  async createContentStream(
    filename: string,
    options?: RangeOptions
  ): Promise<ReadStream> {
    if (!(await FSHelper.exists(filename))) {
      throw new PreviewNotFoundException();
    }

    return createReadStream(filename, options);
  }
}
