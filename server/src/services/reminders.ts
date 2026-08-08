import { getDb } from '../db/index.js';
import { createNotification, getSetting } from './app.js';
import { isSmtpConfigured, sendMail } from './mail.js';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function hoursSince(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso.includes('T') ? iso : `${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (Date.now() - t) / (1000 * 60 * 60);
}

/** Mark past-due invoices, create in-app notifications, optionally email reminders. */
export async function runOverdueReminders(): Promise<{ marked: number; emailed: number }> {
  if (getSetting('reminder_enabled', 'true') !== 'true') {
    return { marked: 0, emailed: 0 };
  }

  const db = getDb();
  const today = todayISO();
  const interval = Math.max(1, Number(getSetting('reminder_interval_hours', '24')) || 24);
  const sendEmails = getSetting('reminder_email', 'true') === 'true' && isSmtpConfigured();
  const company = getSetting('company_name', 'NexBoard');

  // Auto-mark overdue
  const markResult = db
    .prepare(
      `UPDATE invoices
       SET status = 'en_retard', updated_at = datetime('now')
       WHERE due_date IS NOT NULL
         AND due_date < ?
         AND status IN ('envoyee', 'brouillon')`,
    )
    .run(today);

  const overdue = db
    .prepare(
      `SELECT i.id, i.number, i.title, i.amount, i.currency, i.due_date, i.last_reminder_at,
              c.name AS client_name, c.email AS client_email
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE i.status = 'en_retard'
          OR (
            i.due_date IS NOT NULL
            AND i.due_date < ?
            AND i.status NOT IN ('payee', 'annulee')
          )`,
    )
    .all(today) as Array<{
    id: number;
    number: string;
    title: string;
    amount: number;
    currency: string;
    due_date: string | null;
    last_reminder_at: string | null;
    client_name: string;
    client_email: string;
  }>;

  const exists = db.prepare(
    `SELECT id FROM notifications WHERE title = ? AND read = 0 LIMIT 1`,
  );

  let emailed = 0;

  for (const inv of overdue) {
    const title = `Facture en retard · ${inv.number}`;
    if (!exists.get(title)) {
      createNotification({
        type: 'danger',
        title,
        message: `${inv.client_name} — ${inv.title} (échéance ${inv.due_date ?? '—'})`,
        link: '/invoices',
      });
    }

    if (!sendEmails || !inv.client_email) continue;
    if (hoursSince(inv.last_reminder_at) < interval) continue;

    try {
      await sendMail({
        to: inv.client_email,
        subject: `[${company}] Relance — facture ${inv.number}`,
        text: `Bonjour ${inv.client_name},\n\nNous vous rappelons que la facture ${inv.number} (${inv.title}) d’un montant de ${inv.amount} ${inv.currency || 'EUR'} est arrivée à échéance${inv.due_date ? ` le ${inv.due_date}` : ''}.\n\nMerci de procéder au règlement.\n\nCordialement,\n${company}`,
        html: `<p>Bonjour ${inv.client_name},</p><p>Nous vous rappelons que la facture <strong>${inv.number}</strong> (${inv.title}) d’un montant de <strong>${inv.amount} ${inv.currency || 'EUR'}</strong> est arrivée à échéance${inv.due_date ? ` le <strong>${inv.due_date}</strong>` : ''}.</p><p>Merci de procéder au règlement.</p><p>Cordialement,<br/>${company}</p>`,
      });
      db.prepare(
        `UPDATE invoices SET last_reminder_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      ).run(inv.id);
      emailed += 1;
    } catch {
      // Keep going; SMTP issues shouldn't stop other reminders
    }
  }

  return { marked: Number(markResult.changes) || 0, emailed };
}

/** Lightweight sync used by notifications polling (notif only, no email flood). */
export function syncOverdueNotifications(): void {
  const db = getDb();
  const today = todayISO();
  db.prepare(
    `UPDATE invoices
     SET status = 'en_retard', updated_at = datetime('now')
     WHERE due_date IS NOT NULL
       AND due_date < ?
       AND status IN ('envoyee', 'brouillon')`,
  ).run(today);

  const overdue = db
    .prepare(
      `SELECT i.id, i.number, i.title, i.due_date, c.name AS client_name
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE i.status = 'en_retard'`,
    )
    .all() as Array<{
    id: number;
    number: string;
    title: string;
    due_date: string | null;
    client_name: string;
  }>;

  const exists = db.prepare(
    `SELECT id FROM notifications WHERE title = ? AND read = 0 LIMIT 1`,
  );

  for (const inv of overdue) {
    const title = `Facture en retard · ${inv.number}`;
    if (exists.get(title)) continue;
    createNotification({
      type: 'danger',
      title,
      message: `${inv.client_name} — ${inv.title}`,
      link: '/invoices',
    });
  }
}
