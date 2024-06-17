import { Database } from 'better-sqlite3';
import {
  BetterSQLite3Database,
  BetterSQLiteSession
} from 'drizzle-orm/better-sqlite3';

export async function Transaction<TResult>(
  db: BetterSQLite3Database<any>,
  fn: () => Promise<TResult>
) {
  const session = (db as any).session as BetterSQLiteSession<any, any>;
  const client = (session as any).client as Database;

  try {
    client.prepare('begin').run();
    const result = await fn();
    client.prepare('commit').run();

    return result;
  } catch (e) {
    client.prepare('rollback').run();
    throw e;
  }
}
