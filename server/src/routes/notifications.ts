import type { FastifyInstance } from 'fastify';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncOverdueNotifications,
  unreadCount,
} from '../services/app.js';

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/notifications', async () => {
    syncOverdueNotifications();
    return {
      items: listNotifications(),
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
