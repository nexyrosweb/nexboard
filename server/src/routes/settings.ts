import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { getDb } from '../db/index.js';
import {
  createNotification,
  getSettingsMap,
  setSetting,
  uploadsDir,
} from '../services/app.js';
import { isSmtpConfigured, sendMail, verifySmtp } from '../services/mail.js';

const ALLOWED = new Set([
  'company_name',
  'company_email',
  'company_phone',
  'company_address',
  'company_tagline',
  'currency',
  'theme',
  'brand_color',
  'logo_url',
  'smtp_host',
  'smtp_port',
  'smtp_secure',
  'smtp_user',
  'smtp_pass',
  'smtp_from',
  'locale',
]);

const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function publicSettings(map: Record<string, string>) {
  const { smtp_pass: _hidden, ...rest } = map;
  return {
    ...rest,
    smtp_pass_set: Boolean(map.smtp_pass),
    smtp_configured: isSmtpConfigured(),
  };
}

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  await app.register(multipart, {
    limits: { fileSize: 2 * 1024 * 1024 },
  });

  app.get('/api/settings', async () => publicSettings(getSettingsMap()));

  app.put('/api/settings', async (request, reply) => {
    const body = request.body as Record<string, string>;
    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ error: 'Corps invalide' });
    }

    if (body.brand_color && !COLOR_RE.test(body.brand_color)) {
      return reply.status(400).send({ error: 'Couleur invalide (ex. #0891B2)' });
    }

    getDb().exec('BEGIN');
    try {
      for (const [key, value] of Object.entries(body)) {
        if (!ALLOWED.has(key)) continue;
        if (key === 'smtp_pass' && (!value || value === '********')) continue;
        setSetting(key, String(value ?? ''));
      }
      getDb().exec('COMMIT');
    } catch (error) {
      getDb().exec('ROLLBACK');
      throw error;
    }

    return publicSettings(getSettingsMap());
  });

  app.post('/api/settings/logo', async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: 'Aucun fichier reçu' });

    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
    if (!allowed.has(file.mimetype)) {
      return reply.status(400).send({ error: 'Formats acceptés : PNG, JPG, WEBP, SVG' });
    }

    fs.mkdirSync(uploadsDir, { recursive: true });
    const ext =
      file.mimetype === 'image/svg+xml'
        ? '.svg'
        : file.mimetype === 'image/png'
          ? '.png'
          : file.mimetype === 'image/webp'
            ? '.webp'
            : '.jpg';
    const filename = `logo-${Date.now()}${ext}`;
    const target = path.join(uploadsDir, filename);
    const buffer = await file.toBuffer();
    fs.writeFileSync(target, buffer);

    const old = getSettingsMap().logo_url;
    if (old?.startsWith('/uploads/')) {
      const oldPath = path.join(uploadsDir, path.basename(old));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    setSetting('logo_url', `/uploads/${filename}`);
    return publicSettings(getSettingsMap());
  });

  app.delete('/api/settings/logo', async () => {
    const old = getSettingsMap().logo_url;
    if (old?.startsWith('/uploads/')) {
      const oldPath = path.join(uploadsDir, path.basename(old));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    setSetting('logo_url', '');
    return publicSettings(getSettingsMap());
  });

  app.post('/api/settings/smtp/test', async (request, reply) => {
    const body = (request.body ?? {}) as { to?: string };
    const to = body.to || getSettingsMap().company_email;
    if (!to) return reply.status(400).send({ error: 'Indiquez un e-mail de test' });

    try {
      await verifySmtp();
      const company = getSettingsMap().company_name || 'NexBoard';
      await sendMail({
        to,
        subject: `[${company}] Test SMTP réussi`,
        text: `Ceci est un e-mail de test envoyé depuis ${company} via NexBoard.`,
        html: `<p>Ceci est un e-mail de test envoyé depuis <strong>${company}</strong> via NexBoard.</p>`,
      });
      createNotification({
        type: 'success',
        title: 'Test SMTP réussi',
        message: `E-mail envoyé à ${to}`,
        link: '/settings',
      });
      return { ok: true, to };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec SMTP';
      return reply.status(400).send({ error: message });
    }
  });
}
