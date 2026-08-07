import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { createSchema } from './schema.js';
import { seedDatabase } from './seed.js';
import { ensureDefaultSettings } from './defaults.js';

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
  ensureDefaultSettings(db);

  const clientCount = db.prepare('SELECT COUNT(*) AS count FROM clients').get() as {
    count: number;
  };

  if (isNew || clientCount.count === 0) {
    seedDatabase(db);
    console.log('[db] Base initialisée avec données de démonstration');
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
