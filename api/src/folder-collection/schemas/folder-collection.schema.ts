import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { Collection } from '@/collection/schemas/collection.schema';

export const FolderCollection = sqliteTable('folder_collection', {
  id: integer('id')
    .primaryKey()
    .references(() => Collection.id, { onDelete: 'cascade' }),
  collectionId: text('collection_id').notNull().unique(),
  folder: text('folder').notNull(),
  syncedAt: integer('syncedAt')
    .notNull()
    .default(sql`(current_timestamp)`)
});
