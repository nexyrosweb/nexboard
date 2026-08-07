import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';

type ClientBody = {
  name?: string;
  email?: string;
  phone?: string | null;
  company?: string | null;
  status?: string;
  notes?: string | null;
};

const STATUSES = new Set(['actif', 'prospect', 'inactif']);

function likeParam(value: string): string {
  return `%${value}%`;
}

function validate(body: ClientBody) {
  if (!body.name?.trim()) return 'Le nom est obligatoire';
  if (!body.email?.trim()) return 'L’e-mail est obligatoire';
  if (body.status && !STATUSES.has(body.status)) return 'Statut invalide';
  return null;
}

export async function clientsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/clients', async (request) => {
    const db = getDb();
    const query = request.query as { q?: string; status?: string };
    const conditions: string[] = [];
    const params: string[] = [];

    if (query.q) {
      conditions.push(`(name LIKE ? OR email LIKE ? OR company LIKE ? OR phone LIKE ?)`);
      const q = likeParam(query.q);
      params.push(q, q, q, q);
    }
    if (query.status) {
      conditions.push(`status = ?`);
      params.push(query.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return db
      .prepare(`SELECT * FROM clients ${where} ORDER BY created_at DESC`)
      .all(...params);
  });

  app.get<{ Params: { id: string } }>('/api/clients/:id', async (request, reply) => {
    const row = getDb()
      .prepare('SELECT * FROM clients WHERE id = ?')
      .get(Number(request.params.id));
    if (!row) return reply.status(404).send({ error: 'Client introuvable' });
    return row;
  });

  app.post('/api/clients', async (request, reply) => {
    const body = request.body as ClientBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    const result = getDb()
      .prepare(
        `INSERT INTO clients (name, email, phone, company, status, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        body.name!.trim(),
        body.email!.trim(),
        body.phone?.trim() || null,
        body.company?.trim() || null,
        body.status || 'actif',
        body.notes?.trim() || null,
      );

    return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(Number(result.lastInsertRowid));
  });

  app.put<{ Params: { id: string } }>('/api/clients/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = getDb().prepare('SELECT id FROM clients WHERE id = ?').get(id);
    if (!existing) return reply.status(404).send({ error: 'Client introuvable' });

    const body = request.body as ClientBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    getDb()
      .prepare(
        `UPDATE clients
         SET name = ?, email = ?, phone = ?, company = ?, status = ?, notes = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        body.name!.trim(),
        body.email!.trim(),
        body.phone?.trim() || null,
        body.company?.trim() || null,
        body.status || 'actif',
        body.notes?.trim() || null,
        id,
      );

    return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(id);
  });

  app.delete<{ Params: { id: string } }>('/api/clients/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const result = getDb().prepare('DELETE FROM clients WHERE id = ?').run(id);
    if (result.changes === 0) return reply.status(404).send({ error: 'Client introuvable' });
    return { ok: true };
  });
}
