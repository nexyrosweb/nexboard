import type { FastifyInstance } from 'fastify';
import { syncSmartNotifications } from '../services/alerts.js';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
} from '../services/app.js';

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/notifications', async (request) => {
    syncSmartNotifications();
    const query = request.query as { limit?: string };
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    return {
      items: listNotifications(limit),
      unread: unreadCount(),
    };
  });

  app.post<{ Params: { id: string } }>(
    '/api/notifications/:id/read',
    async (request, reply) => {
      const ok = markNotificationRead(Number(request.params.id));
      if (!ok) return reply.status(404).send({ error: 'Notification introuvable' });
      return { ok: true, unread: unreadCount() };
    },
  );

  app.post('/api/notifications/read-all', async () => {
    markAllNotificationsRead();
    return { ok: true, unread: 0 };
  });
}
