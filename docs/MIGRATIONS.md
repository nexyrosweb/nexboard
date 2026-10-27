# SQLite migrations (NexBoard 2.0)

## Overview

NexBoard uses two complementary mechanisms:

1. **Legacy evolve-in-place** — `server/src/db/migrate.ts`  
   Upgrades 1.x schemas (status CHECKs, `currency`, `tasks`, etc.).

2. **Versioned migrations** — `server/src/db/migrations/` + `migrationsRunner.ts`  
   Ledger table `schema_migrations`. New 2.0+ changes must be added here.

On every boot: `createSchema` → `migrateSchema` → `runVersionedMigrations` → defaults → optional seed.

## Rules

- Never drop customer tables or wipe invoices/settings.
- Prefer `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN` with existence checks.
- Wrap each versioned migration in a transaction (runner does this).
- Test on a **copy** of a real database before upgrading production.

## Auth tables (migration `002_auth_and_activity`)

| Table | Purpose |
|-------|---------|
| `users` | Accounts (`admin` / `user`), scrypt password hashes |
| `sessions` | Server-side sessions (token hash, expiry) |
| `activity_logs` | Audit trail for auth and sensitive actions |

Passwords are never stored in plaintext.

## Demo seed

- Seed runs only when the **database file is brand new** and `SEED_DEMO=true`.
- An existing file with zero clients is **not** reseeded (2.0 fix).

## Backup & restore

### Backup

- UI / `GET /api/backup` downloads the SQLite file.
- When `AUTH_ENABLED=true`, only **admins** can download.

### Restore (safe procedure)

1. Stop NexBoard.
2. Copy the current DB aside:  
   `copy data\nexboard.db data\nexboard.db.bak` (Windows) or `cp` on Unix.
3. Replace with the backup file (same path as `DATABASE_PATH`).
4. Start NexBoard — migrations run automatically if needed.
5. Verify clients/invoices/settings.

Do not replace the DB file while the process is running (WAL mode).

## Testing a migration on a copy

```bash
# From server/
copy data\nexboard.db data\nexboard-migtest.db
set DATABASE_PATH=./data/nexboard-migtest.db
npm run dev
# Confirm logs: [db] Base existante chargée / migration applied
```

## Adding a migration

1. Append an entry to `server/src/db/migrations/registry.ts` with a new monotonic id (`003_...`).
2. Document it in this file.
3. Run against a DB copy.
4. Update `ROADMAP.md` checklist only after verification.
