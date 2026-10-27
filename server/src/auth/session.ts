import { createHash, randomBytes } from 'node:crypto';
import { getDb } from '../db/index.js';
import { config } from '../config.js';

export const SESSION_COOKIE = 'nexboard_session';

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

export type SessionRow = {
  id: string;
  user_id: number;
  token_hash: string;
  expires_at: string;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function expiresAtIso(): string {
  const ms = config.sessionDays * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

export function createSession(userId: number, meta?: { ip?: string; userAgent?: string }): string {
  const db = getDb();
  const id = randomBytes(16).toString('hex');
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expires = expiresAtIso();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, tokenHash, expires, meta?.ip ?? null, meta?.userAgent ?? null);

  return `${id}.${token}`;
}

export function destroySession(rawToken: string | undefined): void {
  if (!rawToken) return;
  const [id] = rawToken.split('.');
  if (!id) return;
  getDb().prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
}

export function destroyAllSessionsForUser(userId: number): void {
  getDb().prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

export function resolveSession(rawToken: string | undefined): AuthUser | null {
  if (!rawToken) return null;
  const [id, token] = rawToken.split('.');
  if (!id || !token) return null;

  const db = getDb();
  const session = db
    .prepare(
      `SELECT id, user_id, token_hash, expires_at FROM sessions WHERE id = ?`,
    )
    .get(id) as SessionRow | undefined;

  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
    return null;
  }

  const expected = session.token_hash;
  const actual = hashToken(token);
  if (expected.length !== actual.length) return null;
  // constant-time compare via buffers
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(actual, 'hex');
  if (a.length !== b.length || !timingSafeEqualHex(a, b)) return null;

  const user = db
    .prepare(
      `SELECT id, email, name, role, active FROM users WHERE id = ?`,
    )
    .get(session.user_id) as
    | (AuthUser & { active: number })
    | undefined;

  if (!user || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function timingSafeEqualHex(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i]! ^ b[i]!;
  return out === 0;
}

export function purgeExpiredSessions(): void {
  getDb()
    .prepare(`DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')`)
    .run();
}

export function countUsers(): number {
  const row = getDb().prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number };
  return row.c;
}

export function publicUser(user: AuthUser) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
