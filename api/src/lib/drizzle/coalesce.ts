import { AnyColumn, sql } from 'drizzle-orm';

export const coalesce = <T>(value: AnyColumn, defaultValue: T) => {
  return sql`coalesce(${value}, ${defaultValue})`;
};
