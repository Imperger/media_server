import * as Path from 'path';

import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { CreateCollectionException } from './exceptions';
import { Collection } from './schemas/collection.schema';

import { Folder } from '@/file/schemas/folder.schema';
import { FolderCollection } from '@/folder-collection/schemas/folder-collection.schema';
import { coalesce } from '@/lib/drizzle/coalesce';
import { PathHelper } from '@/lib/path-helper';

export interface CreateCollectionResult {
  id: number;
  cover: string;
}

interface CollectionBase {
  id: number;
  caption: string;
  cover: string;
}

export interface CollectionFolder extends CollectionBase {
  type: 'folder';
  size: number;
}

export interface CollectionView extends CollectionBase {
  type: 'view';
}

export type CollectionRecord = CollectionFolder | CollectionView;

@Injectable()
export class CollectionService {
  constructor(
    @Inject('DB')
    private db: BetterSQLite3Database<{ Collection: typeof Collection }>
  ) {}

  async CreateCollection(
    type: 'folder' | 'view',
    caption?: string
  ): Promise<CreateCollectionResult> {
    const result = await this.db
      .insert(Collection)
      .values({ type, ...(caption && { caption }) })
      .returning({ id: Collection.id, cover: Collection.cover });

    if (result.length === 0) {
      throw new CreateCollectionException();
    }

    return { id: result[0].id, cover: result[0].cover };
  }

  async RemoveCollection(id: number): Promise<boolean> {
    return (
      (await this.db.delete(Collection).where(eq(Collection.id, id))).changes >
      0
    );
  }

  async GetAll(): Promise<CollectionRecord[]> {
    const folders = (await this.db
      .select({
        id: Collection.id,
        type: Collection.type,
        caption: Collection.caption,
        cover: Collection.cover,
        size: coalesce(Folder.size, 0)
      })
      .from(Collection)
      .leftJoin(FolderCollection, eq(Collection.id, FolderCollection.id))
      .leftJoin(
        Folder,
        sql`ltrim(substr(${FolderCollection.folder}, ${PathHelper.mediaEntry.length + 1}), ${Path.sep}) = ${Folder.path}`
      )
      .where(eq(Collection.type, 'folder'))) as CollectionFolder[];

    const views = (await this.db
      .select({
        id: Collection.id,
        type: Collection.type,
        caption: Collection.caption,
        cover: Collection.cover
      })
      .from(Collection)
      .where(eq(Collection.type, 'view'))) as CollectionView[];

    return [...folders, ...views];
  }
}
