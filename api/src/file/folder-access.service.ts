import * as Fs from 'fs/promises';
import * as Path from 'path';

import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { eq, min, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { FileAccessService } from './file-access.service';
import { File } from './schemas/file.schema';
import { Folder } from './schemas/folder.schema';

import { UnknownFolderException } from '@/folder-collection/exceptions';
import { FolderCollectionService } from '@/folder-collection/folder-collection.service';
import { ArrayHelper } from '@/lib/array-helper';
import { assetHash } from '@/lib/asset-hash';
import { increment } from '@/lib/drizzle/increase';
import { isNonEmptyArray } from '@/lib/non-empty-array';
import { PathHelper } from '@/lib/PathHelper';
import { AtLeastOne } from '@/lib/type-helper';
import { TagFolderGlobal } from '@/meta-info/schemas/tag-folder.schema';

export interface IncreaseStats {
  size?: number;
  files?: number;
}

export interface FolderRecord {
  id: number;
  path: string;
  size: number;
  files: number;
}

export interface FolderDescription {
  name: string;
  size: number;
  files: number;
  assetPrefix: string;
}

export interface RemoveFolderResult {
  size: number;
  files: number;
}

@Injectable()
export class FolderAccessService {
  constructor(
    @Inject('DB')
    private readonly db: BetterSQLite3Database<{
      Folder: typeof Folder;
      TagFolderGlobal: typeof TagFolderGlobal;
    }>,
    @Inject(forwardRef(() => FileAccessService))
    private readonly fileAccess: FileAccessService,
    @Inject(forwardRef(() => FolderCollectionService))
    private folderCollection: FolderCollectionService
  ) {}

  /**
   * Creates new folder record with stats or add it if record already exists
   * @param path path relative to the media folder
   * @param size size of a folder
   * @param files file count in a folder
   */
  async upsert(path: string, size: number, files: number): Promise<void> {
    await this.db
      .insert(Folder)
      .values({ path, depth: PathHelper.folderDepth(path), size, files })
      .onConflictDoUpdate({
        target: Folder.path,
        set: {
          size: increment(Folder.size, size),
          files: increment(Folder.files, files)
        }
      });
  }

  async find(
    collectionId: number,
    relativePath: string
  ): Promise<FolderRecord | null> {
    const collection = await this.folderCollection.FindFolder(collectionId);

    if (collection === null) {
      throw new UnknownFolderException();
    }

    const relativeToMediaFilename = Path.join(
      PathHelper.relativeToMedia(collection.folder),
      relativePath
    );

    const folder = await this.db
      .select({
        id: Folder.id,
        path: Folder.path,
        size: Folder.size,
        files: Folder.files
      })
      .from(Folder)
      .where(eq(Folder.path, relativeToMediaFilename));

    return folder.length > 0 ? folder[0] : null;
  }

  async increaseStat(
    path: string,
    stats: AtLeastOne<IncreaseStats>
  ): Promise<void> {
    const incrementQuery = Object.keys(stats).reduce(
      (values, key: keyof IncreaseStats) => ({
        ...values,
        [key]: increment(Folder[key], stats[key])
      }),
      {}
    );

    await this.db
      .update(Folder)
      .set(incrementQuery)
      .where(eq(Folder.path, path));
  }

  async increaseStatAndUpdateParent(
    collectionRoot: string,
    path: string,
    stats: AtLeastOne<IncreaseStats>
  ): Promise<void> {
    await this.increaseStat(path, stats);

    for (const parent of PathHelper.parents(collectionRoot, path)) {
      await this.increaseStat(parent, { ...stats });
    }
  }

  async createAndUpdateParent(
    collectionRoot: string,
    path: string,
    size: number,
    files: number
  ): Promise<void> {
    await this.upsert(path, size, files);

    for (const parent of PathHelper.parents(collectionRoot, path)) {
      await this.upsert(parent, size, files);
    }
  }

  async list(path: string): Promise<FolderDescription[]> {
    let filter = '';
    if (path === '.') {
      path = '';
      filter = '%';
    } else {
      filter = `${path}${Path.sep}%`;
    }

    return (
      await this.db
        .select({
          name: Folder.path,
          size: Folder.size,
          files: Folder.files,
          assetPrefix: min(File.filename)
        })
        .from(Folder)
        .leftJoin(
          File,
          sql`${File.depth} = ${PathHelper.folderDepth(path) + 1} AND ${File.filename} LIKE ${Folder.path} || '%'`
        )
        .where(
          sql`${Folder.path} like ${filter} AND ${Folder.depth} = ${PathHelper.folderDepth(path) + 1}`
        )
        .groupBy(Folder.path)
    ).map((x) => ({
      ...x,
      name: this.folderNameFromPath(x.name),
      assetPrefix: this.assetPrefix(x.assetPrefix)
    }));
  }

  /**
   * Remove a folder and its child records from db
   * @param path path relative to the media
   */
  async removeRecordWithChilds(
    path: string
  ): Promise<RemoveFolderResult | null> {
    const filter = `${path}%`;

    const removedIds = (
      await this.db
        .select({ id: Folder.id })
        .from(Folder)
        .where(sql`${Folder.path} like ${filter}`)
    ).map((x) => x.id);

    for (const id of removedIds) {
      await this.detachTags(id);
    }

    const removed = await this.db
      .delete(Folder)
      .where(sql`${Folder.path} like ${filter}`)
      .returning({ size: Folder.size, files: Folder.files });

    return isNonEmptyArray(removed)
      ? ArrayHelper.max(removed, (a, b) => a.files < b.size)
      : null;
  }

  async resetRecordWithChilds(path: string): Promise<void> {
    const filter = `${path}%`;

    await this.db
      .update(Folder)
      .set({ files: 0, size: 0 })
      .where(sql`${Folder.path} like ${filter}`);
  }

  async removeAllEmpty(): Promise<void> {
    await this.db.delete(Folder).where(eq(Folder.files, 0));
  }

  /**
   * Remove folder all children folders & files and corresponding records in db.
   * Also updates parent folder stat.
   * @param collectionId Collection id
   * @param path Path relative to the collection entry
   */
  async remove(collectionId: number, path: string): Promise<void> {
    const collectionEntry =
      await this.folderCollection.FindFolder(collectionId);

    if (collectionEntry === null) {
      throw new UnknownFolderException();
    }

    const relativeToMedia = Path.join(
      PathHelper.relativeToMedia(collectionEntry.folder),
      path
    );

    const pathList = [relativeToMedia];

    while (pathList.length > 0) {
      const path = pathList.pop()!;

      for (const file of await this.fileAccess.list(path)) {
        await this.fileAccess.removeAssetsAssociatedWithFile(file.filename);
        await this.fileAccess.remove(file.filename);
      }

      pathList.push(
        ...(await this.list(path)).map((x) => Path.join(path, x.name))
      );
    }

    await Fs.rm(Path.join(collectionEntry.folder, path), {
      recursive: true,
      force: true
    });

    const removed = await this.removeRecordWithChilds(relativeToMedia);
    if (removed !== null) {
      this.increaseStatAndUpdateParent(
        relativeToMedia,
        PathHelper.dirname(relativeToMedia),
        {
          size: -removed?.size,
          files: -removed?.files
        }
      );
    }
  }

  async detachTags(folderId: number): Promise<void> {
    await this.db
      .delete(TagFolderGlobal)
      .where(eq(TagFolderGlobal.folderId, folderId));
  }

  private folderNameFromPath(path: string): string {
    const sepIdx = path.lastIndexOf(Path.sep);

    return sepIdx !== -1 ? path.substring(sepIdx + 1) : path;
  }

  private assetPrefix(filename: string | null): string {
    return filename === null ? 'folder_cover' : assetHash(filename);
  }
}
