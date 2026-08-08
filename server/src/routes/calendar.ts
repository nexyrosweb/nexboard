import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';

export type CalendarItemType = 'event' | 'invoice' | 'quote' | 'project' | 'task';

export interface CalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  date: string;
  end_date: string | null;
  all_day: boolean;
  meta: string | null;
  link: string;
  color: string;
  editable: boolean;
  ref_id: number;
}

type EventBody = {
  title?: string;
  description?: string | null;
  location?: string | null;
  starts_at?: string;
  ends_at?: string | null;
  all_day?: boolean | number;
  client_id?: number | null;
  project_id?: number | null;
  task_id?: number | null;
  reminder_minutes?: number | null;
};

function validateEvent(body: EventBody): string | null {
  if (!body.title?.trim()) return 'Le titre est obligatoire';
  if (!body.starts_at?.trim()) return 'La date de début est obligatoire';
  return null;
}

function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

export async function calendarRoutes(app: FastifyInstance): Promise<void> {
  /** Aggregated calendar feed for a date range */
  app.get('/api/calendar', async (request) => {
    const query = request.query as { from?: string; to?: string };
    const from = query.from || new Date().toISOString().slice(0, 8) + '01';
    const to =
      query.to ||
      (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        return d.toISOString().slice(0, 10);
      })();

    const db = getDb();
    const items: CalendarItem[] = [];

    const events = db
      .prepare(
        `SELECT e.*, c.name AS client_name
         FROM calendar_events e
         LEFT JOIN clients c ON c.id = e.client_id
         WHERE date(e.starts_at) <= date(?)
           AND date(COALESCE(e.ends_at, e.starts_at)) >= date(?)
         ORDER BY e.starts_at`,
      )
      .all(to, from) as Array<{
      id: number;
      title: string;
      starts_at: string;
      ends_at: string | null;
      all_day: number;
      client_name: string | null;
      location: string | null;
    }>;

    for (const e of events) {
      items.push({
        id: `event-${e.id}`,
        type: 'event',
        title: e.title,
        date: e.starts_at,
        end_date: e.ends_at,
        all_day: Boolean(e.all_day),
        meta: [e.client_name, e.location].filter(Boolean).join(' · ') || null,
        link: '/calendar',
        color: 'event',
        editable: true,
        ref_id: e.id,
      });
    }

    const invoices = db
      .prepare(
        `SELECT i.id, i.number, i.title, i.due_date, i.status, c.name AS client_name
         FROM invoices i
         JOIN clients c ON c.id = i.client_id
         WHERE i.due_date IS NOT NULL
           AND i.due_date >= ? AND i.due_date <= ?
           AND i.status NOT IN ('annulee')`,
      )
      .all(from, to) as Array<{
      id: number;
      number: string;
      title: string;
      due_date: string;
      status: string;
      client_name: string;
    }>;

    for (const inv of invoices) {
      items.push({
        id: `invoice-${inv.id}`,
        type: 'invoice',
        title: `${inv.number} · ${inv.title}`,
        date: inv.due_date,
        end_date: null,
        all_day: true,
        meta: `${inv.client_name} · ${inv.status}`,
        link: '/invoices',
        color: inv.status === 'en_retard' ? 'danger' : 'invoice',
        editable: false,
        ref_id: inv.id,
      });
    }

    const quotes = db
      .prepare(
        `SELECT q.id, q.number, q.title, q.valid_until, q.status, c.name AS client_name
         FROM quotes q
         JOIN clients c ON c.id = q.client_id
         WHERE q.valid_until IS NOT NULL
           AND q.valid_until >= ? AND q.valid_until <= ?
           AND q.status NOT IN ('accepte', 'refuse', 'expire')`,
      )
      .all(from, to) as Array<{
      id: number;
      number: string;
      title: string;
      valid_until: string;
      status: string;
      client_name: string;
    }>;

    for (const q of quotes) {
      items.push({
        id: `quote-${q.id}`,
        type: 'quote',
        title: `${q.number} · ${q.title}`,
        date: q.valid_until,
        end_date: null,
        all_day: true,
        meta: `${q.client_name} · expire`,
        link: '/quotes',
        color: 'quote',
        editable: false,
        ref_id: q.id,
      });
    }

    const projects = db
      .prepare(
        `SELECT p.id, p.name, p.end_date, p.status, c.name AS client_name
         FROM projects p
         JOIN clients c ON c.id = p.client_id
         WHERE p.end_date IS NOT NULL
           AND p.end_date >= ? AND p.end_date <= ?
           AND p.status NOT IN ('termine', 'annule')`,
      )
      .all(from, to) as Array<{
      id: number;
      name: string;
      end_date: string;
      status: string;
      client_name: string;
    }>;

    for (const p of projects) {
      items.push({
        id: `project-${p.id}`,
        type: 'project',
        title: p.name,
        date: p.end_date,
        end_date: null,
        all_day: true,
        meta: `${p.client_name} · échéance`,
        link: '/projects',
        color: 'project',
        editable: false,
        ref_id: p.id,
      });
    }

    const tasks = db
      .prepare(
        `SELECT t.id, t.title, t.due_date, t.priority, t.status, c.name AS client_name
         FROM tasks t
         LEFT JOIN clients c ON c.id = t.client_id
         WHERE t.due_date IS NOT NULL
           AND t.due_date >= ? AND t.due_date <= ?
           AND t.status NOT IN ('cancelled')`,
      )
      .all(from, to) as Array<{
      id: number;
      title: string;
      due_date: string;
      priority: string;
      status: string;
      client_name: string | null;
    }>;

    for (const t of tasks) {
      items.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.title,
        date: t.due_date,
        end_date: null,
        all_day: true,
        meta: [t.client_name, t.priority, t.status].filter(Boolean).join(' · '),
        link: '/tasks',
        color: t.priority === 'high' ? 'danger' : 'task',
        editable: false,
        ref_id: t.id,
      });
    }

    items.sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)) || a.title.localeCompare(b.title));
    return { from, to, items };
  });

  app.get('/api/calendar/events', async (request) => {
    const query = request.query as { from?: string; to?: string };
    const conditions: string[] = [];
    const params: string[] = [];
    if (query.from) {
      conditions.push(`date(COALESCE(e.ends_at, e.starts_at)) >= date(?)`);
      params.push(query.from);
    }
    if (query.to) {
      conditions.push(`date(e.starts_at) <= date(?)`);
      params.push(query.to);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return getDb()
      .prepare(
        `SELECT e.*, c.name AS client_name, p.name AS project_name
         FROM calendar_events e
         LEFT JOIN clients c ON c.id = e.client_id
         LEFT JOIN projects p ON p.id = e.project_id
         ${where}
         ORDER BY e.starts_at`,
      )
      .all(...params);
  });

  app.post('/api/calendar/events', async (request, reply) => {
    const body = request.body as EventBody;
    const error = validateEvent(body);
    if (error) return reply.status(400).send({ error });

    const result = getDb()
      .prepare(
        `INSERT INTO calendar_events
         (title, description, location, starts_at, ends_at, all_day, client_id, project_id, task_id, reminder_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        body.title!.trim(),
        body.description?.trim() || null,
        body.location?.trim() || null,
        body.starts_at!.trim(),
        body.ends_at || null,
        body.all_day ? 1 : 0,
        body.client_id ?? null,
        body.project_id ?? null,
        body.task_id ?? null,
        body.reminder_minutes ?? null,
      );

    return getDb()
      .prepare(
        `SELECT e.*, c.name AS client_name, p.name AS project_name
         FROM calendar_events e
         LEFT JOIN clients c ON c.id = e.client_id
         LEFT JOIN projects p ON p.id = e.project_id
         WHERE e.id = ?`,
      )
      .get(Number(result.lastInsertRowid));
  });

  app.put<{ Params: { id: string } }>('/api/calendar/events/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = getDb().prepare('SELECT id FROM calendar_events WHERE id = ?').get(id);
    if (!existing) return reply.status(404).send({ error: 'Événement introuvable' });

    const body = request.body as EventBody;
    const error = validateEvent(body);
    if (error) return reply.status(400).send({ error });

    getDb()
      .prepare(
        `UPDATE calendar_events SET
           title = ?, description = ?, location = ?, starts_at = ?, ends_at = ?,
           all_day = ?, client_id = ?, project_id = ?, task_id = ?, reminder_minutes = ?,
           updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        body.title!.trim(),
        body.description?.trim() || null,
        body.location?.trim() || null,
        body.starts_at!.trim(),
        body.ends_at || null,
        body.all_day ? 1 : 0,
        body.client_id ?? null,
        body.project_id ?? null,
        body.task_id ?? null,
        body.reminder_minutes ?? null,
        id,
      );

    return getDb()
      .prepare(
        `SELECT e.*, c.name AS client_name, p.name AS project_name
         FROM calendar_events e
         LEFT JOIN clients c ON c.id = e.client_id
         LEFT JOIN projects p ON p.id = e.project_id
         WHERE e.id = ?`,
      )
      .get(id);
  });

  app.delete<{ Params: { id: string } }>('/api/calendar/events/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const result = getDb().prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
    if (!result.changes) return reply.status(404).send({ error: 'Événement introuvable' });
    return { ok: true };
  });
}
