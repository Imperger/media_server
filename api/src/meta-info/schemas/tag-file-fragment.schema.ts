import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';

import { Tag } from './tag.schema';

import { File } from '@/file/schemas/file.schema';

export const TagFileFragment = sqliteTable('tag_file_fragment', {
  id: integer('id').primaryKey(),
  fileId: integer('file_id')
    .references(() => File.id)
    .notNull(),
  tagId: integer('tag_id')
    .references(() => Tag.id)
    .notNull(),
  begin: integer('begin').notNull(),
  end: integer('end').notNull()
});
