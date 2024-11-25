import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const Tag = sqliteTable('tag', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(), //sub_categoryA.[...sub_categoryN].tag_name
  style: text('style').notNull()
});
