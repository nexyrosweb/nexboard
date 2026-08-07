import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { closeDatabase, initDatabase } from './db/index.js';
import { uploadsDir } from './services/app.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { clientsRoutes } from './routes/clients.js';
import { projectsRoutes } from './routes/projects.js';
import { quotesRoutes } from './routes/quotes.js';
import { invoicesRoutes } from './routes/invoices.js';
import { settingsRoutes } from './routes/settings.js';
import { notificationsRoutes } from './routes/notifications.js';
import { toolsRoutes } from './routes/tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  initDatabase();
  fs.mkdirSync(uploadsDir, { recursive: true });

  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  await app.register(dashboardRoutes);
  await app.register(clientsRoutes);
  await app.register(projectsRoutes);
  await app.register(quotesRoutes);
  await app.register(invoicesRoutes);
  await app.register(settingsRoutes);
  await app.register(notificationsRoutes);
  await app.register(toolsRoutes);

  const clientDist = path.resolve(__dirname, '../../client/dist');
  const bundledPublic = path.resolve(__dirname, '../public');
  const staticRoot = fs.existsSync(clientDist)
    ? clientDist
    : fs.existsSync(bundledPublic)
      ? bundledPublic
      : null;

  if (staticRoot) {
    await app.register(fastifyStatic, {
      root: staticRoot,
      prefix: '/',
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/uploads/')) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}

export async function startServer() {
  const app = await buildServer();

  const shutdown = async () => {
    await app.close();
    closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ port: config.port, host: config.host });
  console.log(`[nexboard] prêt sur http://${config.host}:${config.port}`);
  return app;
}

startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
