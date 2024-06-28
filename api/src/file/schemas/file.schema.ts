import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const File = sqliteTable(
  'file',
  {
    id: integer('id').primaryKey(),
    filename: text('filename').notNull().unique(), // relative to 'media' folder
    depth: integer('depth').notNull(),
    size: integer('size').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    duration: integer('duration').notNull(),
    createdAt: integer('createdAt').notNull(), // file creation date
    syncedAt: integer('syncedAt').notNull()
  },
  (table) => ({
    fileDepthIndex: index('file_depth_index').on(table.depth)
  })
);
