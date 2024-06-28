import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const Folder = sqliteTable(
  'folder',
  {
    id: integer('id').primaryKey(),
    path: text('path').notNull().unique(), // relative to 'media' folder
    depth: integer('depth').notNull(),
    size: integer('size').notNull(),
    files: integer('files').notNull()
  },
  (table) => ({
    folderDepthIndex: index('folder_depth_index').on(table.depth)
  })
);
