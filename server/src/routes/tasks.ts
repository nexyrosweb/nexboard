import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';

const STATUSES = new Set(['todo', 'in_progress', 'done', 'cancelled']);
const PRIORITIES = new Set(['low', 'medium', 'high']);

type TaskBody = {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  due_date?: string | null;
  reminder_at?: string | null;
  assignee?: string | null;
  client_id?: number | null;
  project_id?: number | null;
};

const SELECT = `
  SELECT t.*,
         c.name AS client_name,
         p.name AS project_name
  FROM tasks t
  LEFT JOIN clients c ON c.id = t.client_id
  LEFT JOIN projects p ON p.id = t.project_id
`;

function validate(body: TaskBody): string | null {
  if (!body.title?.trim()) return 'Le titre est obligatoire';
  if (body.status && !STATUSES.has(body.status)) return 'Statut invalide';
  if (body.priority && !PRIORITIES.has(body.priority)) return 'Priorité invalide';
  return null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function tasksRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/tasks', async (request) => {
    const db = getDb();
    const query = request.query as {
      q?: string;
      status?: string;
      priority?: string;
      today?: string;
      client_id?: string;
      project_id?: string;
    };
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (query.q) {
      conditions.push(`(t.title LIKE ? OR t.description LIKE ? OR t.assignee LIKE ?)`);
      const q = `%${query.q}%`;
      params.push(q, q, q);
    }
    if (query.status) {
      conditions.push(`t.status = ?`);
      params.push(query.status);
    }
    if (query.priority) {
      conditions.push(`t.priority = ?`);
      params.push(query.priority);
    }
    if (query.client_id) {
      conditions.push(`t.client_id = ?`);
      params.push(Number(query.client_id));
    }
    if (query.project_id) {
      conditions.push(`t.project_id = ?`);
      params.push(Number(query.project_id));
    }
    if (query.today === '1' || query.today === 'true') {
      conditions.push(`t.due_date = ?`);
      conditions.push(`t.status NOT IN ('done', 'cancelled')`);
      params.push(todayISO());
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return db
      .prepare(
        `${SELECT} ${where}
         ORDER BY
           CASE t.status WHEN 'done' THEN 1 WHEN 'cancelled' THEN 2 ELSE 0 END,
           CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           t.due_date IS NULL, t.due_date ASC, t.id DESC`,
      )
      .all(...params);
  });

  app.get('/api/tasks/today', async () => {
    const db = getDb();
    const today = todayISO();
    return db
      .prepare(
        `${SELECT}
         WHERE t.status NOT IN ('done', 'cancelled')
           AND t.due_date IS NOT NULL
           AND t.due_date <= ?
         ORDER BY
           CASE WHEN t.due_date < ? THEN 0 ELSE 1 END,
           CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           t.due_date ASC`,
      )
      .all(today, today);
  });

  app.get<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const row = getDb()
      .prepare(`${SELECT} WHERE t.id = ?`)
      .get(Number(request.params.id));
    if (!row) return reply.status(404).send({ error: 'Tâche introuvable' });
    return row;
  });

  app.post('/api/tasks', async (request, reply) => {
    const body = request.body as TaskBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    const status = body.status || 'todo';
    const completedAt = status === 'done' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

    const result = getDb()
      .prepare(
        `INSERT INTO tasks
         (title, description, status, priority, due_date, reminder_at, assignee, client_id, project_id, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        body.title!.trim(),
        body.description?.trim() || null,
        status,
        body.priority || 'medium',
        body.due_date || null,
        body.reminder_at || null,
        body.assignee?.trim() || null,
        body.client_id ?? null,
        body.project_id ?? null,
        completedAt,
      );

    return getDb()
      .prepare(`${SELECT} WHERE t.id = ?`)
      .get(Number(result.lastInsertRowid));
  });

  app.put<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = getDb().prepare('SELECT id, status FROM tasks WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!existing) return reply.status(404).send({ error: 'Tâche introuvable' });

    const body = request.body as TaskBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    const status = body.status || 'todo';
    let completedAt: string | null = null;
    if (status === 'done') {
      completedAt =
        existing.status === 'done'
          ? (
              getDb().prepare('SELECT completed_at FROM tasks WHERE id = ?').get(id) as {
                completed_at: string | null;
              }
            ).completed_at
          : new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    getDb()
      .prepare(
        `UPDATE tasks SET
           title = ?, description = ?, status = ?, priority = ?, due_date = ?,
           reminder_at = ?, assignee = ?, client_id = ?, project_id = ?,
           completed_at = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        body.title!.trim(),
        body.description?.trim() || null,
        status,
        body.priority || 'medium',
        body.due_date || null,
        body.reminder_at || null,
        body.assignee?.trim() || null,
        body.client_id ?? null,
        body.project_id ?? null,
        completedAt,
        id,
      );

    return getDb().prepare(`${SELECT} WHERE t.id = ?`).get(id);
  });

  app.delete<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const result = getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
    if (!result.changes) return reply.status(404).send({ error: 'Tâche introuvable' });
    return { ok: true };
  });
}
