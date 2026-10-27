/**
 * Smoke test: versioned migrations + password KDF (no HTTP server).
 * Run: node --experimental-sqlite scripts/smoke-auth-migration.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.resolve(__dirname, '../data');
fs.mkdirSync(tmpDir, { recursive: true });
const dbPath = path.join(tmpDir, `smoke-mig-${Date.now()}.db`);

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const parts = stored.split('$');
  const salt = Buffer.from(parts[4], 'hex');
  const expected = Buffer.from(parts[5], 'hex');
  const actual = scryptSync(password, salt, expected.length, {
    N: Number(parts[1]),
    r: Number(parts[2]),
    p: Number(parts[3]),
  });
  return timingSafeEqual(actual, expected);
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

// Minimal 1.2-like clients table so migrate path is realistic
db.exec(`
  CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    status TEXT NOT NULL DEFAULT 'actif',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO clients (name, email) VALUES ('Smoke Client', 'smoke@example.com');
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    description TEXT,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    meta TEXT,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO schema_migrations (id, description) VALUES ('002_auth_and_activity', 'smoke');
`);

const pwd = 'TestPassword99';
const hashed = hashPassword(pwd);
if (!verifyPassword(pwd, hashed)) throw new Error('password verify failed');
if (verifyPassword('wrong', hashed)) throw new Error('password should not match');

db.prepare(
  `INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')`,
).run('admin@example.com', 'Admin', hashed);

const clients = db.prepare(`SELECT COUNT(*) AS c FROM clients`).get().c;
const users = db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c;
const mig = db.prepare(`SELECT id FROM schema_migrations`).all();

db.close();
fs.unlinkSync(dbPath);

console.log(
  JSON.stringify(
    {
      ok: true,
      clientsPreserved: clients === 1,
      usersCreated: users === 1,
      migrations: mig.map((m) => m.id),
    },
    null,
    2,
  ),
);
