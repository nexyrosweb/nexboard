import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { logActivity } from '../auth/activity.js';
import { assertPasswordStrength, hashPassword } from '../auth/password.js';
import { requireAdmin } from '../auth/permissions.js';
import { destroyAllSessionsForUser } from '../auth/session.js';

type UserBody = {
  email?: string;
  name?: string;
  password?: string;
  role?: 'admin' | 'user';
  active?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function denyIfNeeded(request: { authUser: unknown }, reply: { status: (n: number) => { send: (b: unknown) => unknown } }) {
  if (!config.authEnabled) {
    return reply.status(400).send({ error: 'Authentification désactivée' });
  }
  if (!requireAdmin(request.authUser as never)) {
    return reply.status(403).send({ error: 'Accès administrateur requis', code: 'FORBIDDEN' });
  }
  return null;
}

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/users', async (request, reply) => {
    const denied = denyIfNeeded(request, reply);
    if (denied) return denied;

    return getDb()
      .prepare(
        `SELECT id, email, name, role, active, created_at, updated_at, last_login_at
         FROM users ORDER BY id`,
      )
      .all();
  });

  app.post('/api/users', async (request, reply) => {
    const denied = denyIfNeeded(request, reply);
    if (denied) return denied;

    const body = request.body as UserBody;
    const email = body.email?.trim().toLowerCase() ?? '';
    const name = body.name?.trim() ?? '';
    const role = body.role === 'admin' ? 'admin' : 'user';
    const password = body.password ?? '';

    if (!EMAIL_RE.test(email)) return reply.status(400).send({ error: 'E-mail invalide' });
    if (!name) return reply.status(400).send({ error: 'Le nom est obligatoire' });
    const pwdErr = assertPasswordStrength(password);
    if (pwdErr) return reply.status(400).send({ error: pwdErr });

    try {
      const result = getDb()
        .prepare(
          `INSERT INTO users (email, name, password_hash, role)
           VALUES (?, ?, ?, ?)`,
        )
        .run(email, name, hashPassword(password), role);

      const id = Number(result.lastInsertRowid);
      logActivity({
        userId: request.authUser?.id,
        action: 'user.create',
        entityType: 'user',
        entityId: id,
        meta: { email, role },
        ip: request.ip,
      });

      return getDb()
        .prepare(
          `SELECT id, email, name, role, active, created_at, updated_at, last_login_at
           FROM users WHERE id = ?`,
        )
        .get(id);
    } catch {
      return reply.status(409).send({ error: 'Cet e-mail est déjà utilisé' });
    }
  });

  app.put<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
    const denied = denyIfNeeded(request, reply);
    if (denied) return denied;

    const id = Number(request.params.id);
    const existing = getDb().prepare(`SELECT id, role FROM users WHERE id = ?`).get(id) as
      | { id: number; role: string }
      | undefined;
    if (!existing) return reply.status(404).send({ error: 'Utilisateur introuvable' });

    const body = request.body as UserBody;
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const role = body.role;
    const active = body.active;

    if (email !== undefined && !EMAIL_RE.test(email)) {
      return reply.status(400).send({ error: 'E-mail invalide' });
    }
    if (name !== undefined && !name) {
      return reply.status(400).send({ error: 'Le nom est obligatoire' });
    }
    if (role !== undefined && role !== 'admin' && role !== 'user') {
      return reply.status(400).send({ error: 'Rôle invalide' });
    }

    // Prevent demoting/deactivating the last admin
    if (
      existing.role === 'admin' &&
      ((role === 'user') || active === false)
    ) {
      const admins = getDb()
        .prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1`)
        .get() as { c: number };
      if (admins.c <= 1) {
        return reply.status(400).send({
          error: 'Impossible de retirer le dernier administrateur actif',
        });
      }
    }

    const current = getDb()
      .prepare(`SELECT email, name, role, active, password_hash FROM users WHERE id = ?`)
      .get(id) as {
      email: string;
      name: string;
      role: string;
      active: number;
      password_hash: string;
    };

    let passwordHash = current.password_hash;
    if (body.password) {
      const pwdErr = assertPasswordStrength(body.password);
      if (pwdErr) return reply.status(400).send({ error: pwdErr });
      passwordHash = hashPassword(body.password);
      destroyAllSessionsForUser(id);
    }

    try {
      getDb()
        .prepare(
          `UPDATE users
           SET email = ?, name = ?, role = ?, active = ?, password_hash = ?,
               updated_at = datetime('now')
           WHERE id = ?`,
        )
        .run(
          email ?? current.email,
          name ?? current.name,
          role ?? current.role,
          active === undefined ? current.active : active ? 1 : 0,
          passwordHash,
          id,
        );
    } catch {
      return reply.status(409).send({ error: 'Cet e-mail est déjà utilisé' });
    }

    logActivity({
      userId: request.authUser?.id,
      action: 'user.update',
      entityType: 'user',
      entityId: id,
      ip: request.ip,
    });

    return getDb()
      .prepare(
        `SELECT id, email, name, role, active, created_at, updated_at, last_login_at
         FROM users WHERE id = ?`,
      )
      .get(id);
  });

  app.delete<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
    const denied = denyIfNeeded(request, reply);
    if (denied) return denied;

    const id = Number(request.params.id);
    if (request.authUser?.id === id) {
      return reply.status(400).send({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const existing = getDb().prepare(`SELECT id, role FROM users WHERE id = ?`).get(id) as
      | { id: number; role: string }
      | undefined;
    if (!existing) return reply.status(404).send({ error: 'Utilisateur introuvable' });

    if (existing.role === 'admin') {
      const admins = getDb()
        .prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1`)
        .get() as { c: number };
      if (admins.c <= 1) {
        return reply.status(400).send({ error: 'Impossible de supprimer le dernier administrateur' });
      }
    }

    getDb().prepare(`DELETE FROM users WHERE id = ?`).run(id);
    logActivity({
      userId: request.authUser?.id,
      action: 'user.delete',
      entityType: 'user',
      entityId: id,
      ip: request.ip,
    });
    return { ok: true };
  });
}
