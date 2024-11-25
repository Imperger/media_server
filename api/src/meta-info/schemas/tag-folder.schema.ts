import { integer, sqliteTable, unique } from 'drizzle-orm/sqlite-core';

import { Tag } from './tag.schema';

import { Folder } from '@/file/schemas/folder.schema';

export const TagFolderGlobal = sqliteTable(
  'tag_folder_global',
  {
    id: integer('id').primaryKey(),
    folderId: integer('folder_id')
      .references(() => Folder.id)
      .notNull(),
    tagId: integer('tag_id')
      .references(() => Tag.id)
      .notNull()
  },
  (table) => ({
    folderWithTag: unique().on(table.folderId, table.tagId)
  })
);
