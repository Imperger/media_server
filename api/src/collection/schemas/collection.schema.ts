import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const Collection = sqliteTable('collection', {
  id: integer('id').primaryKey(),
  type: text('type', { enum: ['folder', 'view'] }).notNull(),
  caption: text('caption').notNull().default(''),
  cover: text('cover').notNull().default('img/default_cover.png')
});
