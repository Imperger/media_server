import { integer, sqliteTable, unique } from 'drizzle-orm/sqlite-core';

import { Tag } from './tag.schema';

import { File } from '@/file/schemas/file.schema';

export const TagFileGlobal = sqliteTable(
  'tag_file_global',
  {
    id: integer('id').primaryKey(),
    fileId: integer('file_id')
      .references(() => File.id)
      .notNull(),
    tagId: integer('tag_id')
      .references(() => Tag.id)
      .notNull()
  },
  (table) => ({
    fileWithTag: unique().on(table.fileId, table.tagId)
  })
);
