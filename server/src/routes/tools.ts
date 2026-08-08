import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { createNotification, serverRoot } from '../services/app.js';
import { runSmartAlerts } from '../services/alerts.js';
import { runOverdueReminders } from '../services/reminders.js';

function csvEscape(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(';')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

export async function toolsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/export/:entity', async (request, reply) => {
    const entity = (request.params as { entity: string }).entity;
    const query = request.query as { from?: string; to?: string };
    const db = getDb();
    let rows: Record<string, unknown>[] = [];

    switch (entity) {
      case 'clients': {
        let sql = 'SELECT * FROM clients';
        const params: string[] = [];
        if (query.from) {
          sql += (params.length ? ' AND' : ' WHERE') + ' date(created_at) >= ?';
          params.push(query.from);
        }
        if (query.to) {
          sql += (params.length ? ' AND' : ' WHERE') + ' date(created_at) <= ?';
          params.push(query.to);
        }
        sql += ' ORDER BY id';
        rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
        break;
      }
      case 'projects': {
        let sql = `SELECT p.*, c.name AS client_name FROM projects p
             JOIN clients c ON c.id = p.client_id`;
        const params: string[] = [];
        if (query.from) {
          sql += ' WHERE date(p.created_at) >= ?';
          params.push(query.from);
        }
        if (query.to) {
          sql += (params.length ? ' AND' : ' WHERE') + ' date(p.created_at) <= ?';
          params.push(query.to);
        }
        sql += ' ORDER BY p.id';
        rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
        break;
      }
      case 'quotes': {
        let sql = `SELECT q.*, c.name AS client_name FROM quotes q
             JOIN clients c ON c.id = q.client_id`;
        const params: string[] = [];
        if (query.from) {
          sql += ' WHERE q.issue_date >= ?';
          params.push(query.from);
        }
        if (query.to) {
          sql += (params.length ? ' AND' : ' WHERE') + ' q.issue_date <= ?';
          params.push(query.to);
        }
        sql += ' ORDER BY q.id';
        rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
        break;
      }
      case 'invoices': {
        let sql = `SELECT i.*, c.name AS client_name FROM invoices i
             JOIN clients c ON c.id = i.client_id`;
        const params: string[] = [];
        if (query.from) {
          sql += ' WHERE i.issue_date >= ?';
          params.push(query.from);
        }
        if (query.to) {
          sql += (params.length ? ' AND' : ' WHERE') + ' i.issue_date <= ?';
          params.push(query.to);
        }
        sql += ' ORDER BY i.id';
        rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
        break;
      }
      default:
        return reply.status(404).send({ error: 'Export inconnu' });
    }

    const suffix =
      query.from || query.to
        ? `-${query.from || 'start'}_${query.to || 'end'}`
        : '';
    const csv = toCsv(rows);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename="nexboard-${entity}${suffix}.csv"`,
    );
    return csv;
  });

  app.get('/api/backup', async (_request, reply) => {
    try {
      const raw = config.databasePath;
      const dbPath = path.isAbsolute(raw) ? raw : path.resolve(serverRoot, raw);
      if (!fs.existsSync(dbPath)) {
        createNotification({
          type: 'danger',
          title: 'Sauvegarde échouée',
          message: 'Base de données introuvable.',
          link: '/settings',
          source_key: `backup-fail-${new Date().toISOString().slice(0, 10)}`,
        });
        return reply.status(404).send({ error: 'Base introuvable' });
      }
      const data = fs.readFileSync(dbPath);
      reply.header('Content-Type', 'application/octet-stream');
      reply.header(
        'Content-Disposition',
        `attachment; filename="nexboard-backup-${new Date().toISOString().slice(0, 10)}.db"`,
      );
      return data;
    } catch (err) {
      createNotification({
        type: 'danger',
        title: 'Sauvegarde échouée',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
        link: '/settings',
        source_key: `backup-fail-${new Date().toISOString().slice(0, 10)}`,
      });
      return reply.status(500).send({ error: 'Sauvegarde impossible' });
    }
  });

  app.post('/api/reminders/run', async () => runOverdueReminders());
  app.post('/api/alerts/run', async () => runSmartAlerts());
}
