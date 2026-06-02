import type { Pool } from "pg";
import type Database from "better-sqlite3";

let pgPool: Pool | null = null;
let sqliteDb: Database.Database | null = null;

export function setPgPool(pool: Pool) {
  pgPool = pool;
}

export function getPgPool(): Pool | null {
  return pgPool;
}

export function setSqliteDb(db: Database.Database) {
  sqliteDb = db;
}

export function getSqliteDb(): Database.Database | null {
  return sqliteDb;
}
