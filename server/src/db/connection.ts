import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { config } from '../config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Ensure data directory exists
const dbDir = dirname(config.dbPath);
mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(config.dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
