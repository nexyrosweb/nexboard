import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { createNotification, getSetting } from '../services/app.js';
import { sendMail } from '../services/mail.js';

type QuoteBody = {
  client_id?: number;
  project_id?: number | null;
  number?: string;
  title?: string;
  amount?: number;
  status?: string;
  issue_date?: string;
  valid_until?: string | null;
};

const STATUSES = new Set(['brouillon', 'envoye', 'accepte', 'refuse', 'expire']);

function nextNumber(): string {
  const year = new Date().getFullYear();
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS c FROM quotes WHERE number LIKE ?`)
    .get(`DEV-${year}-%`) as { c: number };
  return `DEV-${year}-${String(row.c + 1).padStart(3, '0')}`;
}

function validate(body: QuoteBody) {
  if (!body.client_id) return 'Le client est obligatoire';
  if (!body.title?.trim()) return 'Le titre est obligatoire';
  if (body.status && !STATUSES.has(body.status)) return 'Statut invalide';
  if (!body.issue_date) return 'La date d’émission est obligatoire';
  return null;
}

const SELECT = `
  SELECT q.*, c.name AS client_name, p.name AS project_name
  FROM quotes q
  JOIN clients c ON c.id = q.client_id
  LEFT JOIN projects p ON p.id = q.project_id
`;

export async function quotesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/quotes', async (request) => {
    const db = getDb();
    const query = request.query as { q?: string; status?: string };
    const conditions: string[] = [];
    const params: string[] = [];

    if (query.q) {
      conditions.push(`(q.number LIKE ? OR q.title LIKE ? OR c.name LIKE ?)`);
      const q = `%${query.q}%`;
      params.push(q, q, q);
    }
    if (query.status) {
      conditions.push(`q.status = ?`);
      params.push(query.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return db.prepare(`${SELECT} ${where} ORDER BY q.created_at DESC`).all(...params);
  });

  app.post('/api/quotes', async (request, reply) => {
    const body = request.body as QuoteBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    const number = body.number?.trim() || nextNumber();
    const issueDate = body.issue_date as string;
    const result = getDb()
      .prepare(
        `INSERT INTO quotes (client_id, project_id, number, title, amount, status, issue_date, valid_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        Number(body.client_id),
        body.project_id ? Number(body.project_id) : null,
        number,
        body.title!.trim(),
        Number(body.amount) || 0,
        body.status || 'brouillon',
        issueDate,
        body.valid_until || null,
      );

    return getDb().prepare(`${SELECT} WHERE q.id = ?`).get(Number(result.lastInsertRowid));
  });

  app.put<{ Params: { id: string } }>('/api/quotes/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = getDb().prepare('SELECT id FROM quotes WHERE id = ?').get(id);
    if (!existing) return reply.status(404).send({ error: 'Devis introuvable' });

    const body = request.body as QuoteBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    const issueDate = body.issue_date as string;
    getDb()
      .prepare(
        `UPDATE quotes
         SET client_id = ?, project_id = ?, number = ?, title = ?, amount = ?,
             status = ?, issue_date = ?, valid_until = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        Number(body.client_id),
        body.project_id ? Number(body.project_id) : null,
        body.number?.trim() || nextNumber(),
        body.title!.trim(),
        Number(body.amount) || 0,
        body.status || 'brouillon',
        issueDate,
        body.valid_until || null,
        id,
      );

    return getDb().prepare(`${SELECT} WHERE q.id = ?`).get(id);
  });

  app.delete<{ Params: { id: string } }>('/api/quotes/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const result = getDb().prepare('DELETE FROM quotes WHERE id = ?').run(id);
    if (result.changes === 0) return reply.status(404).send({ error: 'Devis introuvable' });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/quotes/:id/convert', async (request, reply) => {
    const id = Number(request.params.id);
    const quote = getDb().prepare(`${SELECT} WHERE q.id = ?`).get(id) as
      | {
          id: number;
          client_id: number;
          project_id: number | null;
          number: string;
          title: string;
          amount: number;
          status: string;
        }
      | undefined;

    if (!quote) return reply.status(404).send({ error: 'Devis introuvable' });

    const existing = getDb()
      .prepare('SELECT id, number FROM invoices WHERE quote_id = ?')
      .get(id) as { id: number; number: string } | undefined;
    if (existing) {
      return reply.status(409).send({
        error: `Déjà converti en facture ${existing.number}`,
        invoice_id: existing.id,
      });
    }

    const year = new Date().getFullYear();
    const countRow = getDb()
      .prepare(`SELECT COUNT(*) AS c FROM invoices WHERE number LIKE ?`)
      .get(`FAC-${year}-%`) as { c: number };
    const invoiceNumber = `FAC-${year}-${String(countRow.c + 1).padStart(3, '0')}`;
    const issueDate = new Date().toISOString().slice(0, 10);
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const dueDate = due.toISOString().slice(0, 10);

    const result = getDb()
      .prepare(
        `INSERT INTO invoices (client_id, project_id, quote_id, number, title, amount, status, issue_date, due_date)
         VALUES (?, ?, ?, ?, ?, ?, 'brouillon', ?, ?)`,
      )
      .run(
        quote.client_id,
        quote.project_id,
        quote.id,
        invoiceNumber,
        quote.title,
        quote.amount,
        issueDate,
        dueDate,
      );

    if (quote.status !== 'accepte') {
      getDb()
        .prepare(`UPDATE quotes SET status = 'accepte', updated_at = datetime('now') WHERE id = ?`)
        .run(quote.id);
    }

    createNotification({
      type: 'success',
      title: `Devis converti · ${quote.number}`,
      message: `Facture ${invoiceNumber} créée`,
      link: '/invoices',
    });

    const invoiceSelect = `
      SELECT i.*, c.name AS client_name, p.name AS project_name
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE i.id = ?
    `;

    return {
      invoice: getDb().prepare(invoiceSelect).get(Number(result.lastInsertRowid)),
      quote: getDb().prepare(`${SELECT} WHERE q.id = ?`).get(quote.id),
    };
  });

  app.post<{ Params: { id: string } }>('/api/quotes/:id/send', async (request, reply) => {
    const quote = getDb()
      .prepare(
        `SELECT q.*, c.name AS client_name, c.email AS client_email
         FROM quotes q JOIN clients c ON c.id = q.client_id WHERE q.id = ?`,
      )
      .get(Number(request.params.id)) as
      | {
          id: number;
          number: string;
          title: string;
          amount: number;
          client_name: string;
          client_email: string;
        }
      | undefined;

    if (!quote) return reply.status(404).send({ error: 'Devis introuvable' });

    const company = getSetting('company_name', 'NexBoard');
    try {
      await sendMail({
        to: quote.client_email,
        subject: `[${company}] Devis ${quote.number} — ${quote.title}`,
        text: `Bonjour ${quote.client_name},\n\nVoici votre devis ${quote.number} (${quote.title}) d’un montant de ${quote.amount} €.\n\nCordialement,\n${company}`,
        html: `<p>Bonjour ${quote.client_name},</p><p>Voici votre devis <strong>${quote.number}</strong> — ${quote.title}.</p><p>Montant : <strong>${quote.amount} €</strong></p><p>Cordialement,<br/>${company}</p>`,
      });
      getDb()
        .prepare(`UPDATE quotes SET status = 'envoye', updated_at = datetime('now') WHERE id = ?`)
        .run(quote.id);
      createNotification({
        type: 'success',
        title: `Devis envoyé · ${quote.number}`,
        message: `Envoyé à ${quote.client_email}`,
        link: '/quotes',
      });
      return getDb().prepare(`${SELECT} WHERE q.id = ?`).get(quote.id);
    } catch (err) {
      return reply
        .status(400)
        .send({ error: err instanceof Error ? err.message : 'Envoi impossible' });
    }
  });
}
