import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { serverRoot } from '../services/app.js';

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
    const db = getDb();
    let rows: Record<string, unknown>[] = [];

    switch (entity) {
      case 'clients':
        rows = db.prepare('SELECT * FROM clients ORDER BY id').all() as Record<
          string,
          unknown
        >[];
        break;
      case 'projects':
        rows = db
          .prepare(
            `SELECT p.*, c.name AS client_name FROM projects p
             JOIN clients c ON c.id = p.client_id ORDER BY p.id`,
          )
          .all() as Record<string, unknown>[];
        break;
      case 'quotes':
        rows = db
          .prepare(
            `SELECT q.*, c.name AS client_name FROM quotes q
             JOIN clients c ON c.id = q.client_id ORDER BY q.id`,
          )
          .all() as Record<string, unknown>[];
        break;
      case 'invoices':
        rows = db
          .prepare(
            `SELECT i.*, c.name AS client_name FROM invoices i
             JOIN clients c ON c.id = i.client_id ORDER BY i.id`,
          )
          .all() as Record<string, unknown>[];
        break;
      default:
        return reply.status(404).send({ error: 'Export inconnu' });
    }

    const csv = toCsv(rows);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="nexboard-${entity}.csv"`);
    return csv;
  });

  app.get('/api/backup', async (_request, reply) => {
    const raw = config.databasePath;
    const dbPath = path.isAbsolute(raw) ? raw : path.resolve(serverRoot, raw);
    if (!fs.existsSync(dbPath)) {
      return reply.status(404).send({ error: 'Base introuvable' });
    }
    const data = fs.readFileSync(dbPath);
    reply.header('Content-Type', 'application/octet-stream');
    reply.header(
      'Content-Disposition',
      `attachment; filename="nexboard-backup-${new Date().toISOString().slice(0, 10)}.db"`,
    );
    return data;
  });
}
