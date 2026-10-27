import type { DatabaseSync } from 'node:sqlite';
import { migrations } from './migrations/registry.js';

function ensureLedger(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      description TEXT,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getAppliedMigrations(db: DatabaseSync): string[] {
  ensureLedger(db);
  const rows = db.prepare(`SELECT id FROM schema_migrations ORDER BY id`).all() as Array<{
    id: string;
  }>;
  return rows.map((r) => r.id);
}

/** Apply pending versioned migrations. Safe to call on every boot. */
export function runVersionedMigrations(db: DatabaseSync): string[] {
  ensureLedger(db);
  const applied = new Set(getAppliedMigrations(db));
  const newly: string[] = [];

  const insert = db.prepare(
    `INSERT INTO schema_migrations (id, description) VALUES (?, ?)`,
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    db.exec('BEGIN');
    try {
      migration.up(db);
      insert.run(migration.id, migration.description);
      db.exec('COMMIT');
      newly.push(migration.id);
      console.log(`[db] migration applied: ${migration.id}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  return newly;
}
