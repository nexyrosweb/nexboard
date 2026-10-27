import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { closeDatabase, initDatabase } from './db/index.js';
import { uploadsDir } from './services/app.js';
import { runSmartAlerts } from './services/alerts.js';
import { registerAuthGate } from './plugins/authGate.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { clientsRoutes } from './routes/clients.js';
import { projectsRoutes } from './routes/projects.js';
import { quotesRoutes } from './routes/quotes.js';
import { invoicesRoutes } from './routes/invoices.js';
import { settingsRoutes } from './routes/settings.js';
import { notificationsRoutes } from './routes/notifications.js';
import { toolsRoutes } from './routes/tools.js';
import { tasksRoutes } from './routes/tasks.js';
import { calendarRoutes } from './routes/calendar.js';
import { importRoutes } from './routes/import.js';
import { authRoutes } from './routes/auth.js';
import { usersRoutes } from './routes/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(cookie, {
    secret: config.authSecret || 'nexboard-dev-cookie',
  });

  await app.register(rateLimit, {
    global: false,
  });

  initDatabase();
  fs.mkdirSync(uploadsDir, { recursive: true });

  await registerAuthGate(app);

  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(dashboardRoutes);
  await app.register(clientsRoutes);
  await app.register(projectsRoutes);
  await app.register(quotesRoutes);
  await app.register(invoicesRoutes);
  await app.register(tasksRoutes);
  await app.register(calendarRoutes);
  await app.register(settingsRoutes);
  await app.register(notificationsRoutes);
  await app.register(toolsRoutes);
  await app.register(importRoutes);

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
  if (config.authEnabled) {
    console.log('[nexboard] authentification activée (AUTH_ENABLED=true)');
  } else {
    console.log(
      '[nexboard] authentification désactivée — activez AUTH_ENABLED=true pour les déploiements exposés',
    );
  }

  void runSmartAlerts().catch((err) => {
    console.warn('[nexboard] alertes init:', err);
  });
  setInterval(() => {
    void runSmartAlerts().catch((err) => {
      console.warn('[nexboard] alertes:', err);
    });
  }, 60 * 60 * 1000);

  return app;
}

startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
