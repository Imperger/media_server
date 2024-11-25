import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, ne, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { union } from 'drizzle-orm/sqlite-core';

import { InvalidTagNameException } from './exceptions';
import { TagFileFragment } from './schemas/tag-file-fragment.schema';
import { TagFileGlobal } from './schemas/tag-file-global.schema';
import { TagFolderGlobal } from './schemas/tag-folder.schema';
import { Tag } from './schemas/tag.schema';

import { AsyncExceptionTrap } from '@/lib/exception-trap';
import { Transaction } from '@/lib/Transaction';
import { LiveFeedService } from '@/live-feed/live-feed.service';

export interface TagStyle {
  fontColor: string;
  backgroundColor: string;
}

export interface Tag {
  tag: string;
  style: TagStyle;
}

export interface TagDescriptor {
  id: number;
  style: TagStyle;
}

@Injectable()
export class TagService {
  constructor(
    @Inject('DB')
    private readonly db: BetterSQLite3Database<{
      Tag: typeof Tag;
      TagFileGlobal: typeof TagFileGlobal;
      TagFileFragment: typeof TagFileFragment;
      TagFolderGlobal: typeof TagFolderGlobal;
    }>,
    private readonly liveFeed: LiveFeedService
  ) {}

  async create(name: string, style: TagStyle): Promise<void> {
    const samePrefix = `${name}%`;

    const conflictLeafs = this.db
      .select({ count: count(Tag.id) })
      .from(Tag)
      .where(sql`${Tag.name} like ${samePrefix}`);

    const conflictNodes = this.db
      .select({ count: count(Tag.id) })
      .from(Tag)
      .where(inArray(Tag.name, TagService.tagToSubpaths(name)));

    const conflicts = await union(conflictLeafs, conflictNodes);

    if (conflicts.reduce((acc, x) => acc + x.count, 0) > 0) {
      throw new InvalidTagNameException();
    }

    const created =
      (await this.db.insert(Tag).values({ name, style: JSON.stringify(style) }))
        .changes > 0;

    if (created) {
      this.liveFeed.Tag.boradcastUpdate({ type: 'add', name, style });
    }
  }

  async rename(oldName: string, newName: string): Promise<void> {
    if (oldName === newName) {
      return;
    }

    const samePrefix = `${newName}%`;

    const conflictLeafs = this.db
      .select({ count: count(Tag.id) })
      .from(Tag)
      .where(and(ne(Tag.name, oldName), sql`${Tag.name} like ${samePrefix}`));

    const conflictNodes = this.db
      .select({ count: count(Tag.id) })
      .from(Tag)
      .where(
        and(
          ne(Tag.name, oldName),
          inArray(Tag.name, TagService.tagToSubpaths(newName))
        )
      );

    const conflicts = await union(conflictLeafs, conflictNodes);

    if (conflicts.reduce((acc, x) => acc + x.count, 0) > 0) {
      throw new InvalidTagNameException();
    }

    const renamed =
      (
        await this.db
          .update(Tag)
          .set({ name: newName })
          .where(eq(Tag.name, oldName))
      ).changes > 0;

    if (renamed) {
      this.liveFeed.Tag.boradcastUpdate({ type: 'rename', oldName, newName });
    }
  }

  async listAll(): Promise<Tag[]> {
    return (
      await this.db.select({ name: Tag.name, style: Tag.style }).from(Tag)
    ).map((x) => ({ tag: x.name, style: JSON.parse(x.style) }));
  }

  async find(name: string): Promise<number> {
    const tag = (
      await this.db.select({ id: Tag.id }).from(Tag).where(eq(Tag.name, name))
    ).map((x) => x.id);

    return tag.length === 1 ? tag[0] : -1;
  }

  async findWithProps(name: string): Promise<TagDescriptor | null> {
    const tag = await this.db
      .select({ id: Tag.id, style: Tag.style })
      .from(Tag)
      .where(eq(Tag.name, name));

    return tag.length === 1
      ? { id: tag[0].id, style: JSON.parse(tag[0].style) }
      : null;
  }

  async delete(name: string): Promise<boolean> {
    let deleted = await AsyncExceptionTrap.Try(
      async () =>
        (await this.db.delete(Tag).where(eq(Tag.name, name))).changes > 0
    ).CatchValue('foreign_key_block');

    if (deleted === 'foreign_key_block') {
      deleted = await Transaction(this.db, async () => {
        const tagId = await this.find(name);
        if (tagId === -1) return false;
        await this.db
          .delete(TagFileGlobal)
          .where(eq(TagFileGlobal.tagId, tagId));
        await this.db
          .delete(TagFileFragment)
          .where(eq(TagFileFragment.tagId, tagId));
        await this.db
          .delete(TagFolderGlobal)
          .where(eq(TagFolderGlobal.tagId, tagId));
        await this.db.delete(Tag).where(eq(Tag.name, name));
        return true;
      });
    }

    if (deleted) {
      this.liveFeed.Tag.boradcastUpdate({ type: 'delete', name });
    }

    return !!deleted;
  }

  private static tagToSubpaths(tag: string): string[] {
    return tag
      .split('.')
      .reduce<
        string[]
      >((sub, part) => (sub.length > 0 ? [...sub, `${sub[sub.length - 1]}.${part}`] : [part]), []);
  }
}
