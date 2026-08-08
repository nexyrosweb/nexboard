import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { createNotification, getSetting } from '../services/app.js';
import { sendMail } from '../services/mail.js';
import { buildDocumentPdf } from '../services/pdf.js';
import {
  getDefaultCurrency,
  isValidCurrency,
  isValidStatus,
} from '../services/statuses.js';
import { nextInvoiceNumber, numberAsFilename } from '../services/documentNumbers.js';

type InvoiceBody = {
  client_id?: number;
  project_id?: number | null;
  quote_id?: number | null;
  number?: string;
  title?: string;
  amount?: number;
  currency?: string;
  status?: string;
  issue_date?: string;
  due_date?: string | null;
  paid_at?: string | null;
};

function validate(body: InvoiceBody) {
  if (!body.client_id) return 'Le client est obligatoire';
  if (!body.title?.trim()) return 'Le titre est obligatoire';
  if (body.status && !isValidStatus('invoices', body.status)) return 'Statut invalide';
  if (body.currency && !isValidCurrency(body.currency)) return 'Devise invalide';
  if (!body.issue_date) return 'La date d’émission est obligatoire';
  return null;
}

const SELECT = `
  SELECT i.*, c.name AS client_name, p.name AS project_name
  FROM invoices i
  JOIN clients c ON c.id = i.client_id
  LEFT JOIN projects p ON p.id = i.project_id
`;

export async function invoicesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/invoices', async (request) => {
    const db = getDb();
    const query = request.query as {
      q?: string;
      status?: string;
      from?: string;
      to?: string;
    };
    const conditions: string[] = [];
    const params: string[] = [];

    if (query.q) {
      conditions.push(`(i.number LIKE ? OR i.title LIKE ? OR c.name LIKE ?)`);
      const q = `%${query.q}%`;
      params.push(q, q, q);
    }
    if (query.status) {
      conditions.push(`i.status = ?`);
      params.push(query.status);
    }
    if (query.from) {
      conditions.push(`i.issue_date >= ?`);
      params.push(query.from);
    }
    if (query.to) {
      conditions.push(`i.issue_date <= ?`);
      params.push(query.to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return db.prepare(`${SELECT} ${where} ORDER BY i.created_at DESC`).all(...params);
  });

  app.post('/api/invoices', async (request, reply) => {
    const body = request.body as InvoiceBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    const status = body.status || 'brouillon';
    const paidAt = status === 'payee' ? body.paid_at || new Date().toISOString().slice(0, 10) : null;
    const number = body.number?.trim() || nextInvoiceNumber();
    const issueDate = body.issue_date as string;
    const currency = (body.currency || getDefaultCurrency()).toUpperCase();

    const result = getDb()
      .prepare(
        `INSERT INTO invoices (client_id, project_id, quote_id, number, title, amount, currency, status, issue_date, due_date, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        Number(body.client_id),
        body.project_id ? Number(body.project_id) : null,
        body.quote_id ? Number(body.quote_id) : null,
        number,
        body.title!.trim(),
        Number(body.amount) || 0,
        currency,
        status,
        issueDate,
        body.due_date || null,
        paidAt,
      );

    return getDb().prepare(`${SELECT} WHERE i.id = ?`).get(Number(result.lastInsertRowid));
  });

  app.put<{ Params: { id: string } }>('/api/invoices/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const existing = getDb().prepare('SELECT id FROM invoices WHERE id = ?').get(id);
    if (!existing) return reply.status(404).send({ error: 'Facture introuvable' });

    const body = request.body as InvoiceBody;
    const error = validate(body);
    if (error) return reply.status(400).send({ error });

    const status = body.status || 'brouillon';
    const paidAt =
      status === 'payee' ? body.paid_at || new Date().toISOString().slice(0, 10) : null;
    const issueDate = body.issue_date as string;
    const currency = (body.currency || getDefaultCurrency()).toUpperCase();

    getDb()
      .prepare(
        `UPDATE invoices
         SET client_id = ?, project_id = ?, quote_id = ?, number = ?, title = ?, amount = ?,
             currency = ?, status = ?, issue_date = ?, due_date = ?, paid_at = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        Number(body.client_id),
        body.project_id ? Number(body.project_id) : null,
        body.quote_id ? Number(body.quote_id) : null,
        body.number?.trim() || nextInvoiceNumber(),
        body.title!.trim(),
        Number(body.amount) || 0,
        currency,
        status,
        issueDate,
        body.due_date || null,
        paidAt,
        id,
      );

    return getDb().prepare(`${SELECT} WHERE i.id = ?`).get(id);
  });

  app.delete<{ Params: { id: string } }>('/api/invoices/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const result = getDb().prepare('DELETE FROM invoices WHERE id = ?').run(id);
    if (result.changes === 0) return reply.status(404).send({ error: 'Facture introuvable' });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/invoices/:id/send', async (request, reply) => {
    const invoice = getDb()
      .prepare(
        `SELECT i.*, c.name AS client_name, c.email AS client_email, c.company AS client_company,
                p.name AS project_name
         FROM invoices i
         JOIN clients c ON c.id = i.client_id
         LEFT JOIN projects p ON p.id = i.project_id
         WHERE i.id = ?`,
      )
      .get(Number(request.params.id)) as
      | {
          id: number;
          number: string;
          title: string;
          amount: number;
          currency: string;
          status: string;
          issue_date: string;
          due_date: string | null;
          client_name: string;
          client_email: string;
          client_company: string | null;
          project_name: string | null;
        }
      | undefined;

    if (!invoice) return reply.status(404).send({ error: 'Facture introuvable' });

    const company = getSetting('company_name', 'NexBoard');
    const currency = invoice.currency || getDefaultCurrency();
    try {
      const pdf = await buildDocumentPdf({
        kind: 'invoice',
        number: invoice.number,
        title: invoice.title,
        amount: invoice.amount,
        currency,
        status: invoice.status,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        client_name: invoice.client_name,
        client_email: invoice.client_email,
        client_company: invoice.client_company,
        project_name: invoice.project_name,
      });

      await sendMail({
        to: invoice.client_email,
        subject: `[${company}] Facture ${invoice.number} — ${invoice.title}`,
        text: `Bonjour ${invoice.client_name},\n\nVoici votre facture ${invoice.number} (${invoice.title}) d’un montant de ${invoice.amount} ${currency}.${invoice.due_date ? `\nÉchéance : ${invoice.due_date}` : ''}\n\nLe PDF est joint à cet e-mail.\n\nCordialement,\n${company}`,
        html: `<p>Bonjour ${invoice.client_name},</p><p>Voici votre facture <strong>${invoice.number}</strong> — ${invoice.title}.</p><p>Montant : <strong>${invoice.amount} ${currency}</strong>${invoice.due_date ? `<br/>Échéance : ${invoice.due_date}` : ''}</p><p>Le PDF est joint à cet e-mail.</p><p>Cordialement,<br/>${company}</p>`,
        attachments: [
          {
            filename: numberAsFilename(invoice.number),
            content: pdf,
            contentType: 'application/pdf',
          },
        ],
      });
      getDb()
        .prepare(
          `UPDATE invoices SET status = CASE WHEN status = 'brouillon' THEN 'envoyee' ELSE status END, updated_at = datetime('now') WHERE id = ?`,
        )
        .run(invoice.id);
      createNotification({
        type: 'success',
        title: `Facture envoyée · ${invoice.number}`,
        message: `Envoyée à ${invoice.client_email} (PDF joint)`,
        link: '/invoices',
      });
      return getDb().prepare(`${SELECT} WHERE i.id = ?`).get(invoice.id);
    } catch (err) {
      return reply
        .status(400)
        .send({ error: err instanceof Error ? err.message : 'Envoi impossible' });
    }
  });
}
