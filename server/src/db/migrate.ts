import type { DatabaseSync } from 'node:sqlite';

function tableExists(db: DatabaseSync, name: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name) as { name: string } | undefined;
  return Boolean(row);
}

function columnExists(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

function rebuildWithoutStatusCheck(
  db: DatabaseSync,
  table: string,
  createSql: string,
  columns: string[],
): void {
  const sql = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table) as { sql: string } | undefined;
  if (!sql?.sql) return;
  if (!/CHECK\s*\(\s*status\s+IN/i.test(sql.sql)) return;

  const tmp = `${table}_mig`;
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec(`ALTER TABLE ${table} RENAME TO ${tmp}`);
  db.exec(createSql);
  const cols = columns.join(', ');
  db.exec(`INSERT INTO ${table} (${cols}) SELECT ${cols} FROM ${tmp}`);
  db.exec(`DROP TABLE ${tmp}`);
  db.exec('PRAGMA foreign_keys = ON');
}

/** Evolve existing DBs: drop rigid status CHECKs, add currency / reminder columns. */
export function migrateSchema(db: DatabaseSync): void {
  if (!tableExists(db, 'clients')) return;

  rebuildWithoutStatusCheck(
    db,
    'clients',
    `CREATE TABLE clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      status TEXT NOT NULL DEFAULT 'actif',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    ['id', 'name', 'email', 'phone', 'company', 'status', 'notes', 'created_at', 'updated_at'],
  );

  rebuildWithoutStatusCheck(
    db,
    'projects',
    `CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'en_cours',
      budget REAL NOT NULL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    [
      'id',
      'client_id',
      'name',
      'description',
      'status',
      'budget',
      'start_date',
      'end_date',
      'created_at',
      'updated_at',
    ],
  );

  rebuildWithoutStatusCheck(
    db,
    'quotes',
    `CREATE TABLE quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'brouillon',
      issue_date TEXT NOT NULL,
      valid_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    [
      'id',
      'client_id',
      'project_id',
      'number',
      'title',
      'amount',
      'status',
      'issue_date',
      'valid_until',
      'created_at',
      'updated_at',
    ],
  );

  rebuildWithoutStatusCheck(
    db,
    'invoices',
    `CREATE TABLE invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
      number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'brouillon',
      issue_date TEXT NOT NULL,
      due_date TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    [
      'id',
      'client_id',
      'project_id',
      'quote_id',
      'number',
      'title',
      'amount',
      'status',
      'issue_date',
      'due_date',
      'paid_at',
      'created_at',
      'updated_at',
    ],
  );

  if (tableExists(db, 'quotes') && !columnExists(db, 'quotes', 'currency')) {
    db.exec(`ALTER TABLE quotes ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR'`);
  }
  if (tableExists(db, 'invoices') && !columnExists(db, 'invoices', 'currency')) {
    db.exec(`ALTER TABLE invoices ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR'`);
  }
  if (tableExists(db, 'invoices') && !columnExists(db, 'invoices', 'last_reminder_at')) {
    db.exec(`ALTER TABLE invoices ADD COLUMN last_reminder_at TEXT`);
  }

  // Normalize compact FAC-YYYY-NNN → "FAC - YYYY - NNN"
  if (tableExists(db, 'invoices')) {
    const compact = db
      .prepare(
        `SELECT id, number FROM invoices WHERE number GLOB 'FAC-[0-9][0-9][0-9][0-9]-[0-9]*'
           AND number NOT LIKE 'FAC - %'`,
      )
      .all() as Array<{ id: number; number: string }>;
    const update = db.prepare(`UPDATE invoices SET number = ? WHERE id = ?`);
    for (const row of compact) {
      const m = row.number.match(/^FAC-(\d{4})-(\d+)$/);
      if (m) update.run(`FAC - ${m[1]} - ${m[2].padStart(3, '0')}`, row.id);
    }
  }

  if (tableExists(db, 'notifications') && !columnExists(db, 'notifications', 'source_key')) {
    db.exec(`ALTER TABLE notifications ADD COLUMN source_key TEXT`);
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_source_key ON notifications(source_key) WHERE source_key IS NOT NULL`,
    );
  }

  if (!tableExists(db, 'tasks')) {
    db.exec(`
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium'
          CHECK (priority IN ('low', 'medium', 'high')),
        due_date TEXT,
        reminder_at TEXT,
        assignee TEXT,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  if (!tableExists(db, 'calendar_events')) {
    db.exec(`
      CREATE TABLE calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        starts_at TEXT NOT NULL,
        ends_at TEXT,
        all_day INTEGER NOT NULL DEFAULT 0,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
        reminder_minutes INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_events_starts ON calendar_events(starts_at);
  `);
}
