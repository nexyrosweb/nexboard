import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';

type ProjectBody = {
  client_id?: number;
  name?: string;
  description?: string | null;
  status?: string;
  budget?: number;
  start_date?: string | null;
  end_date?: string | null;
};

const STATUSES = new Set(['brouillon', 'en_cours', 'termine', 'annule']);

function validate(body: ProjectBody) {
  if (!body.name?.trim()) return 'Le nom est obligatoire';
  if (!body.client_id) return 'Le client est obligatoire';
  if (body.status && !STATUSES.has(body.status)) return 'Statut invalide';
  return null;
}

const SELECT = `
  SELECT p.*, c.name AS client_name
  FROM projects p
  JOIN clients c ON c.id = p.client_id
`;

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/projects', async (request) => {
    const db = getDb();
    const query = request.query as { q?: string; status?: string; client_id?: string };
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (query.q) {
      conditions.push(`(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)`);
      const q = `%${query.q}%`;
      params.push(q, q, q);
    }
    if (query.status) {
      conditions.push(`p.status = ?`);
      params.push(query.status);
    }
    if (query.client_id) {
      conditions.push(`p.client_id = ?`);
      params.push(Number(query.client_id));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return db.prepare(`${SELECT} ${where} ORDER BY p.created_at DESC`).all(...params);
  });

  app.get<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const row = getDb()
      .prepare(`${SELECT} WHERE p.id = ?`)
      .get(Number(request.params.id));
    if (!row) return reply.status(404).send({ error: 'Projet introuvable' });
    return row;
  });

  app.post('/api/projects', async (request, reply) => {
    const body = request.body as ProjectBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    const client = getDb().prepare('SELECT id FROM clients WHERE id = ?').get(Number(body.client_id));
    if (!client) return reply.status(400).send({ error: 'Client introuvable' });

    const result = getDb()
      .prepare(
        `INSERT INTO projects (client_id, name, description, status, budget, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        Number(body.client_id),
        body.name!.trim(),
        body.description?.trim() || null,
        body.status || 'en_cours',
        Number(body.budget) || 0,
        body.start_date || null,
        body.end_date || null,
      );

    return getDb().prepare(`${SELECT} WHERE p.id = ?`).get(Number(result.lastInsertRowid));
  });

  app.put<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = getDb().prepare('SELECT id FROM projects WHERE id = ?').get(id);
    if (!existing) return reply.status(404).send({ error: 'Projet introuvable' });

    const body = request.body as ProjectBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    getDb()
      .prepare(
        `UPDATE projects
         SET client_id = ?, name = ?, description = ?, status = ?, budget = ?,
             start_date = ?, end_date = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        Number(body.client_id),
        body.name!.trim(),
        body.description?.trim() || null,
        body.status || 'en_cours',
        Number(body.budget) || 0,
        body.start_date || null,
        body.end_date || null,
        id,
      );

    return getDb().prepare(`${SELECT} WHERE p.id = ?`).get(id);
  });

  app.delete<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const result = getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
    if (result.changes === 0) return reply.status(404).send({ error: 'Projet introuvable' });
    return { ok: true };
  });
}
