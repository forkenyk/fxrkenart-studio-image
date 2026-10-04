import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config';

mkdirSync(path.dirname(config.databasePath), { recursive: true });
export const db = new DatabaseSync(config.databasePath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(readFileSync(path.resolve(process.cwd(), 'schema.sql'), 'utf8'));

export function one<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | null {
  return (db.prepare(sql).get(...params) as T | undefined) || null;
}

export function many<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...params);
}

export function transaction<T>(work: () => T): T {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = work();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}
