import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { getDashboardData } from '../services/dashboard.js';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/dashboard', async () => getDashboardData());

  app.get('/api/health', async () => ({
    ok: true,
    service: 'nexboard',
    version: '1.2.0',
    authEnabled: config.authEnabled,
    time: new Date().toISOString(),
  }));
}
