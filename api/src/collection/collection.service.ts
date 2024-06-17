import { Inject, Injectable } from '@nestjs/common';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { Collection } from './schemas/collection.schema';
import { CreateCollectionException } from './exceptions';
import { eq } from 'drizzle-orm';

export interface CreateCollectionResult {
  id: number;
  cover: string;
}

export interface CollectionRecord {
  id: number;
  type: 'folder' | 'view';
  caption: string;
  cover: string;
}

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
    return this.db
      .select({
        id: Collection.id,
        type: Collection.type,
        caption: Collection.caption,
        cover: Collection.cover
      })
      .from(Collection)
      .all();
  }
}
