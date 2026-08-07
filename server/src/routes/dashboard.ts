import type { FastifyInstance } from 'fastify';
import { getDashboardData } from '../services/dashboard.js';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/dashboard', async () => getDashboardData());

  app.get('/api/health', async () => ({
    ok: true,
    service: 'nexboard',
    time: new Date().toISOString(),
  }));
}
