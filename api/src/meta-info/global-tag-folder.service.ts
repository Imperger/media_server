import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import {
  InvalidTagNameException,
  TagNotFoundException,
  UnknowAttachmentTargetException
} from './exceptions';
import { TagFolderGlobal } from './schemas/tag-folder.schema';
import { Tag } from './schemas/tag.schema';
import { TagService } from './tag.service';

import { FolderAccessService } from '@/file/folder-access.service';
import { AsyncExceptionTrap } from '@/lib/exception-trap';
import { LiveFeedService } from '@/live-feed/live-feed.service';

@Injectable()
export class GlobalTagFolderService {
  constructor(
    @Inject('DB')
    private readonly db: BetterSQLite3Database<{
      TagFolderGlobal: typeof TagFolderGlobal;
    }>,
    private readonly tag: TagService,
    private readonly folderAccess: FolderAccessService,
    private readonly liveFeed: LiveFeedService
  ) {}

  async attach(
    tag: string,
    collectionId: number,
    relativePath: string
  ): Promise<void> {
    const tagId = await this.tag.find(tag);

    if (tagId === -1) {
      throw new TagNotFoundException();
    }

    const folder = await this.folderAccess.find(collectionId, relativePath);

    if (folder === null) {
      throw new UnknowAttachmentTargetException();
    }

    const attached = await AsyncExceptionTrap.Try(async () =>
      this.db
        .insert(TagFolderGlobal)
        .values({ folderId: folder.id, tagId: tagId })
    )
      .ReturnValue(true)
      .CatchValue(false);

    if (!attached) {
      throw new InvalidTagNameException();
    }

    this.liveFeed.GlobalFolderTag.boradcastUpdate(collectionId, relativePath, {
      type: 'add',
      name: tag
    });
  }

  async list(collectionId: number, relativePath: string): Promise<string[]> {
    const folder = await this.folderAccess.find(collectionId, relativePath);

    if (folder === null) {
      throw new UnknowAttachmentTargetException();
    }

    return (
      await this.db
        .select({ name: Tag.name })
        .from(TagFolderGlobal)
        .leftJoin(Tag, eq(TagFolderGlobal.tagId, Tag.id))
        .where(eq(TagFolderGlobal.folderId, folder.id))
    ).map((x) => x.name!);
  }

  async detach(
    tag: string,
    collectionId: number,
    relativePath: string
  ): Promise<void> {
    const tagId = await this.tag.find(tag);

    if (tagId === -1) {
      throw new TagNotFoundException();
    }

    const folder = await this.folderAccess.find(collectionId, relativePath);

    if (folder === null) {
      throw new UnknowAttachmentTargetException();
    }

    const detached =
      (
        await this.db
          .delete(TagFolderGlobal)
          .where(
            and(
              eq(TagFolderGlobal.folderId, folder.id),
              eq(TagFolderGlobal.tagId, tagId)
            )
          )
      ).changes > 0;

    if (detached) {
      this.liveFeed.GlobalFolderTag.boradcastUpdate(
        collectionId,
        relativePath,
        {
          type: 'remove',
          name: tag
        }
      );
    }
  }
}
