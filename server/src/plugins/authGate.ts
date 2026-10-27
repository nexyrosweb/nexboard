import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import {
  SESSION_COOKIE,
  countUsers,
  resolveSession,
  type AuthUser,
} from '../auth/session.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser | null;
  }
}

const PUBLIC_EXACT = new Set([
  '/api/health',
  '/api/auth/status',
  '/api/auth/login',
  '/api/auth/setup',
]);

function isPublicApi(url: string, method: string): boolean {
  const path = url.split('?')[0] ?? url;
  if (PUBLIC_EXACT.has(path)) return true;
  if (path === '/api/auth/logout' && method === 'POST') return true;
  return false;
}

export async function registerAuthGate(app: FastifyInstance): Promise<void> {
  app.decorateRequest('authUser', null);

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = (request.url.split('?')[0] ?? request.url) as string;

    if (!path.startsWith('/api/')) {
      request.authUser = null;
      return;
    }

    const raw = request.cookies?.[SESSION_COOKIE];
    request.authUser = resolveSession(raw);

    if (!config.authEnabled) {
      return;
    }

    if (isPublicApi(path, request.method)) {
      return;
    }

    const setupRequired = countUsers() === 0;
    if (setupRequired) {
      return reply.status(401).send({
        error: 'Configuration initiale requise',
        code: 'SETUP_REQUIRED',
      });
    }

    if (!request.authUser) {
      return reply.status(401).send({
        error: 'Authentification requise',
        code: 'UNAUTHORIZED',
      });
    }
  });
}
