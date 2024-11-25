import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import {
  FragmentTagCollisionException,
  InvalidTagNameException,
  TagNotFoundException
} from './exceptions';
import { TagFileFragment } from './schemas/tag-file-fragment.schema';
import { Tag } from './schemas/tag.schema';
import { TagService, TagStyle } from './tag.service';

import { FileNotFoundException } from '@/file/exceptions';
import { FileAccessService } from '@/file/file-access.service';
import { TagParser } from '@/lib/tag-parser';
import { Transaction } from '@/lib/Transaction';
import { LiveFeedService } from '@/live-feed/live-feed.service';

export interface TagAttachment {
  tag: string;
  begin: number;
  end: number;
}

export interface TagUpdate {
  tag: string;
  begin?: number;
  end?: number;
}

export interface Tag {
  name: string;
  begin: number;
  end: number;
  style: TagStyle;
}

interface TagBoundary {
  begin: number;
  end: number;
}

@Injectable()
export class FragmentTagFileService {
  constructor(
    @Inject('DB')
    private readonly db: BetterSQLite3Database<{
      TagFragment: typeof TagFileFragment;
      Tag: typeof Tag;
    }>,
    private readonly tag: TagService,
    private readonly file: FileAccessService,
    private readonly liveFeed: LiveFeedService
  ) {}

  async attach(
    collectionId: number,
    filename: string,
    { tag, begin, end }: TagAttachment
  ): Promise<void> {
    const tagDesc = await this.tag.findWithProps(tag);

    if (tagDesc === null) {
      throw new TagNotFoundException();
    }

    const targetFile = await this.file.find(collectionId, filename);

    if (targetFile === null) {
      throw new FileNotFoundException();
    }

    await Transaction(this.db, async () => {
      const depth = TagParser.depth(tag);
      const subcategoryFilter = `${TagParser.subcategory(tag)}.%`;

      const sameSubcategoryRanges = (
        await this.db
          .select({
            name: Tag.name,
            begin: TagFileFragment.begin,
            end: TagFileFragment.end
          })
          .from(TagFileFragment)
          .leftJoin(Tag, eq(TagFileFragment.tagId, Tag.id))
          .where(
            and(
              eq(TagFileFragment.fileId, targetFile.id),
              sql`${Tag.name} like ${subcategoryFilter}`
            )
          )
      ).filter((x) => TagParser.depth(x.name!) === depth) as Tag[];

      const alreadyAttached = sameSubcategoryRanges.some((x) => x.name === tag);

      if (alreadyAttached) {
        throw new InvalidTagNameException();
      }

      const intersectsWithSubcategory = sameSubcategoryRanges.some((x) =>
        FragmentTagFileService.intersection(x, { begin, end })
      );

      if (intersectsWithSubcategory) {
        throw new FragmentTagCollisionException();
      }

      await this.db
        .insert(TagFileFragment)
        .values({ fileId: targetFile.id, tagId: tagDesc.id, begin, end });
    });

    this.liveFeed.FragmentFileTag.boradcastUpdate(collectionId, filename, {
      type: 'add',
      name: tag,
      begin,
      end,
      style: tagDesc.style
    });
  }

  async update(
    collectionId: number,
    filename: string,
    { tag, ...update }: TagUpdate
  ): Promise<void> {
    const tagId = await this.tag.find(tag);

    if (tagId === -1) {
      throw new TagNotFoundException();
    }

    const targetFile = await this.file.find(collectionId, filename);

    if (targetFile === null) {
      throw new FileNotFoundException();
    }

    const updated = await Transaction(this.db, async () => {
      const depth = TagParser.depth(tag);
      const subcategoryFilter = `${TagParser.subcategory(tag)}.%`;

      const sameSubcategoryRanges = (
        await this.db
          .select({
            name: Tag.name,
            begin: TagFileFragment.begin,
            end: TagFileFragment.end
          })
          .from(TagFileFragment)
          .leftJoin(Tag, eq(TagFileFragment.tagId, Tag.id))
          .where(
            and(
              eq(TagFileFragment.fileId, targetFile.id),
              sql`${Tag.name} like ${subcategoryFilter}`
            )
          )
      ).filter((x) => TagParser.depth(x.name!) === depth) as Tag[];

      const updatedTagIdx = sameSubcategoryRanges.findIndex(
        (x) => x.name === tag
      );

      const updatedTag: Tag = {
        ...sameSubcategoryRanges[updatedTagIdx],
        ...update
      };

      const intersectsWithSubcategory = [
        ...sameSubcategoryRanges.slice(0, updatedTagIdx),
        ...sameSubcategoryRanges.slice(updatedTagIdx + 1)
      ].some((x) => FragmentTagFileService.intersection(x, updatedTag));

      if (intersectsWithSubcategory) {
        throw new FragmentTagCollisionException();
      }

      return (
        (
          await this.db
            .update(TagFileFragment)
            .set(update)
            .where(
              and(
                eq(TagFileFragment.fileId, targetFile.id),
                eq(TagFileFragment.tagId, tagId)
              )
            )
        ).changes > 0
      );
    });

    if (updated) {
      this.liveFeed.FragmentFileTag.boradcastUpdate(collectionId, filename, {
        type: 'update',
        tag,
        ...update
      });
    }
  }

  async list(collectionId: number, filename: string): Promise<Tag[]> {
    const file = await this.file.find(collectionId, filename);

    if (file === null) {
      throw new FileNotFoundException();
    }

    return (
      await this.db
        .select({
          name: Tag.name,
          begin: TagFileFragment.begin,
          end: TagFileFragment.end,
          style: Tag.style
        })
        .from(TagFileFragment)
        .leftJoin(Tag, eq(TagFileFragment.tagId, Tag.id))
        .where(eq(TagFileFragment.fileId, file.id))
    ).map((x) => ({ ...x, style: JSON.parse(x.style!) })) as Tag[];
  }

  async detach(
    tag: string,
    collectionId: number,
    filename: string
  ): Promise<void> {
    const tagId = await this.tag.find(tag);

    if (tagId === -1) {
      throw new TagNotFoundException();
    }

    const file = await this.file.find(collectionId, filename);

    if (file === null) {
      throw new FileNotFoundException();
    }

    const detached =
      (
        await this.db
          .delete(TagFileFragment)
          .where(
            and(
              eq(TagFileFragment.fileId, file.id),
              eq(TagFileFragment.tagId, tagId)
            )
          )
      ).changes > 0;

    if (detached) {
      this.liveFeed.FragmentFileTag.boradcastUpdate(collectionId, filename, {
        type: 'remove',
        name: tag
      });
    }
  }

  static intersection(a: TagBoundary, b: TagBoundary): boolean {
    return a.begin < b.end && b.begin < a.end;
  }
}
