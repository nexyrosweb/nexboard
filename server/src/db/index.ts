import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { createSchema } from './schema.js';
import { seedDatabase } from './seed.js';
import { ensureDefaultSettings } from './defaults.js';
import { migrateSchema } from './migrate.js';
import { runVersionedMigrations } from './migrationsRunner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');

let db: DatabaseSync | null = null;

function resolveDbPath(): string {
  const raw = config.databasePath;
  return path.isAbsolute(raw) ? raw : path.resolve(serverRoot, raw);
}

export function getDb(): DatabaseSync {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): DatabaseSync {
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const isNew = !fs.existsSync(dbPath);
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  createSchema(db);
  migrateSchema(db);
  runVersionedMigrations(db);
  ensureDefaultSettings(db);

  // Only seed brand-new files when SEED_DEMO is enabled.
  // Never re-seed an existing database that happens to have zero clients.
  if (isNew && config.seedDemo) {
    seedDatabase(db);
    console.log('[db] Base initialisée avec données de démonstration');
  } else if (isNew) {
    console.log('[db] Base vide créée (SEED_DEMO=false)');
  } else {
    console.log('[db] Base existante chargée');
  }

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
