import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const File = sqliteTable(
  'file',
  {
    id: integer('id').primaryKey(),
    filename: text('filename').notNull().unique(), // relative to 'media' folder
    depth: integer('depth').notNull(),
    size: integer('size').notNull(),
    width: integer('width').notNull(),
    orientation: text('orientation', {
      enum: ['landscape', 'portrait']
    }).notNull(),
    height: integer('height').notNull(),
    duration: integer('duration').notNull(),
    createdAt: integer('createdAt').notNull(), // file creation date
    syncedAt: integer('syncedAt').notNull()
  },
  (table) => ({
    fileDepthIndex: index('file_depth_index').on(table.depth),
    fileWidthIndex: index('file_width_index').on(table.width),
    fileHeightIndex: index('file_height_index').on(table.height),
    fileOrientationIndex: index('file_orientation_index').on(table.orientation)
  })
);
