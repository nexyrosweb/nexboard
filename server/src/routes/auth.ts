import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { logActivity } from '../auth/activity.js';
import { assertPasswordStrength, hashPassword, verifyPassword } from '../auth/password.js';
import { requireAdmin } from '../auth/permissions.js';
import {
  SESSION_COOKIE,
  countUsers,
  createSession,
  destroySession,
  publicUser,
  purgeExpiredSessions,
} from '../auth/session.js';

type SetupBody = {
  email?: string;
  name?: string;
  password?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cookieOpts() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.isProd,
    maxAge: config.sessionDays * 24 * 60 * 60,
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/auth/status', async (request) => {
    purgeExpiredSessions();
    const users = countUsers();
    return {
      authEnabled: config.authEnabled,
      setupRequired: config.authEnabled && users === 0,
      user: request.authUser ? publicUser(request.authUser) : null,
    };
  });

  app.post(
    '/api/auth/setup',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
    if (!config.authEnabled) {
      return reply.status(400).send({ error: 'Authentification désactivée (AUTH_ENABLED=false)' });
    }
    if (countUsers() > 0) {
      return reply.status(409).send({ error: 'Configuration déjà effectuée' });
    }

    const body = request.body as SetupBody;
    const email = body.email?.trim().toLowerCase() ?? '';
    const name = body.name?.trim() ?? '';
    const password = body.password ?? '';

    if (!EMAIL_RE.test(email)) return reply.status(400).send({ error: 'E-mail invalide' });
    if (!name) return reply.status(400).send({ error: 'Le nom est obligatoire' });
    const pwdErr = assertPasswordStrength(password);
    if (pwdErr) return reply.status(400).send({ error: pwdErr });

    const passwordHash = hashPassword(password);
    const result = getDb()
      .prepare(
        `INSERT INTO users (email, name, password_hash, role)
         VALUES (?, ?, ?, 'admin')`,
      )
      .run(email, name, passwordHash);

    const userId = Number(result.lastInsertRowid);
    const token = createSession(userId, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    reply.setCookie(SESSION_COOKIE, token, cookieOpts());

    logActivity({
      userId,
      action: 'auth.setup',
      entityType: 'user',
      entityId: userId,
      ip: request.ip,
    });

    return {
      user: { id: userId, email, name, role: 'admin' as const },
    };
  },
  );

  app.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
    if (!config.authEnabled) {
      return reply.status(400).send({ error: 'Authentification désactivée' });
    }

    const body = request.body as LoginBody;
    const email = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';

    if (!email || !password) {
      return reply.status(400).send({ error: 'E-mail et mot de passe requis' });
    }

    const row = getDb()
      .prepare(
        `SELECT id, email, name, role, password_hash, active FROM users WHERE email = ?`,
      )
      .get(email) as
      | {
          id: number;
          email: string;
          name: string;
          role: 'admin' | 'user';
          password_hash: string;
          active: number;
        }
      | undefined;

    const invalid = () =>
      reply.status(401).send({ error: 'Identifiants invalides', code: 'INVALID_CREDENTIALS' });

    if (!row || !row.active) {
      logActivity({
        action: 'auth.login_failed',
        meta: { email },
        ip: request.ip,
      });
      return invalid();
    }

    if (!verifyPassword(password, row.password_hash)) {
      logActivity({
        userId: row.id,
        action: 'auth.login_failed',
        meta: { email },
        ip: request.ip,
      });
      return invalid();
    }

    destroySession(request.cookies?.[SESSION_COOKIE]);
    const token = createSession(row.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    reply.setCookie(SESSION_COOKIE, token, cookieOpts());

    getDb()
      .prepare(`UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
      .run(row.id);

    logActivity({
      userId: row.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: row.id,
      ip: request.ip,
    });

    return {
      user: publicUser({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
      }),
    };
  },
  );

  app.post('/api/auth/logout', async (request, reply) => {
    const raw = request.cookies?.[SESSION_COOKIE];
    if (request.authUser) {
      logActivity({
        userId: request.authUser.id,
        action: 'auth.logout',
        ip: request.ip,
      });
    }
    destroySession(raw);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (request, reply) => {
    if (!config.authEnabled) {
      return { authEnabled: false, user: null };
    }
    if (!request.authUser) {
      return reply.status(401).send({ error: 'Non authentifié', code: 'UNAUTHORIZED' });
    }
    return { authEnabled: true, user: publicUser(request.authUser) };
  });

  app.get('/api/activity', async (request, reply) => {
    if (config.authEnabled && !requireAdmin(request.authUser)) {
      return reply.status(403).send({ error: 'Accès administrateur requis', code: 'FORBIDDEN' });
    }
    const limit = Math.min(
      Number((request.query as { limit?: string }).limit) || 50,
      200,
    );
    return getDb()
      .prepare(
        `SELECT a.id, a.user_id, u.email AS user_email, a.action, a.entity_type, a.entity_id,
                a.meta, a.ip, a.created_at
         FROM activity_logs a
         LEFT JOIN users u ON u.id = a.user_id
         ORDER BY a.id DESC
         LIMIT ?`,
      )
      .all(limit);
  });
}
