import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { InvalidTagNameException, TagNotFoundException } from './exceptions';
import { TagFileGlobal } from './schemas/tag-file-global.schema';
import { Tag } from './schemas/tag.schema';
import { TagService } from './tag.service';

import { FileNotFoundException } from '@/file/exceptions';
import { FileAccessService } from '@/file/file-access.service';
import { AsyncExceptionTrap } from '@/lib/exception-trap';
import { LiveFeedService } from '@/live-feed/live-feed.service';

@Injectable()
export class GlobalTagFileService {
  constructor(
    @Inject('DB')
    private readonly db: BetterSQLite3Database<{
      TagFileGlobal: typeof TagFileGlobal;
    }>,
    private readonly tag: TagService,
    private readonly file: FileAccessService,
    private readonly liveFeed: LiveFeedService
  ) {}

  async attach(
    tag: string,
    collectionId: number,
    filename: string
  ): Promise<void> {
    const tagId = await this.tag.find(tag);

    if (tagId === -1) {
      throw new TagNotFoundException();
    }

    const targetFile = await this.file.find(collectionId, filename);

    if (targetFile === null) {
      throw new FileNotFoundException();
    }

    const attached = await AsyncExceptionTrap.Try(async () =>
      this.db
        .insert(TagFileGlobal)
        .values({ fileId: targetFile.id, tagId: tagId })
    )
      .ReturnValue(true)
      .CatchValue(false);

    if (!attached) {
      throw new InvalidTagNameException();
    }

    this.liveFeed.GlobalFileTag.boradcastUpdate(collectionId, filename, {
      type: 'add',
      name: tag
    });
  }

  async list(collectionId: number, filename: string): Promise<string[]> {
    const file = await this.file.find(collectionId, filename);

    if (file === null) {
      throw new FileNotFoundException();
    }

    return (
      await this.db
        .select({ name: Tag.name })
        .from(TagFileGlobal)
        .leftJoin(Tag, eq(TagFileGlobal.tagId, Tag.id))
        .where(eq(TagFileGlobal.fileId, file.id))
    ).map((x) => x.name!);
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
          .delete(TagFileGlobal)
          .where(
            and(
              eq(TagFileGlobal.fileId, file.id),
              eq(TagFileGlobal.tagId, tagId)
            )
          )
      ).changes > 0;

    if (detached) {
      this.liveFeed.GlobalFileTag.boradcastUpdate(collectionId, filename, {
        type: 'remove',
        name: tag
      });
    }
  }
}
