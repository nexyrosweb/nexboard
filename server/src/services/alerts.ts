import { getDb } from '../db/index.js';
import { ensureNotification, getSetting } from './app.js';
import { runOverdueReminders } from './reminders.js';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** Smart notification center: overdue invoices, expiring quotes, project deadlines, tasks, events. */
export async function runSmartAlerts(): Promise<{ created: number }> {
  const overdue = await runOverdueReminders();
  let created = overdue.marked + overdue.emailed;

  const db = getDb();
  const today = todayISO();
  const quoteDays = Math.max(1, Number(getSetting('alert_quote_days', '7')) || 7);
  const projectDays = Math.max(1, Number(getSetting('alert_project_days', '7')) || 7);
  const quoteUntil = addDays(today, quoteDays);
  const projectUntil = addDays(today, projectDays);

  // Quotes expiring soon
  const quotes = db
    .prepare(
      `SELECT q.id, q.number, q.title, q.valid_until, c.name AS client_name
       FROM quotes q
       JOIN clients c ON c.id = q.client_id
       WHERE q.valid_until IS NOT NULL
         AND q.valid_until >= ?
         AND q.valid_until <= ?
         AND q.status IN ('brouillon', 'envoye')`,
    )
    .all(today, quoteUntil) as Array<{
    id: number;
    number: string;
    title: string;
    valid_until: string;
    client_name: string;
  }>;

  for (const q of quotes) {
    const n = ensureNotification({
      type: 'warning',
      title: `Devis expire bientôt · ${q.number}`,
      message: `${q.title} (${q.client_name}) — validité jusqu’au ${q.valid_until}`,
      link: '/quotes',
      source_key: `quote-expiring-${q.id}-${q.valid_until}`,
    });
    if (n) created += 1;
  }

  // Projects nearing deadline
  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.end_date, c.name AS client_name
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.end_date IS NOT NULL
         AND p.end_date >= ?
         AND p.end_date <= ?
         AND p.status = 'en_cours'`,
    )
    .all(today, projectUntil) as Array<{
    id: number;
    name: string;
    end_date: string;
    client_name: string;
  }>;

  for (const p of projects) {
    const n = ensureNotification({
      type: 'warning',
      title: `Projet proche de l’échéance · ${p.name}`,
      message: `${p.client_name} — échéance le ${p.end_date}`,
      link: '/projects',
      source_key: `project-due-${p.id}-${p.end_date}`,
    });
    if (n) created += 1;
  }

  // Tasks due today / overdue / reminder_at reached
  const tasks = db
    .prepare(
      `SELECT t.id, t.title, t.due_date, t.reminder_at, t.priority, t.assignee
       FROM tasks t
       WHERE t.status NOT IN ('done', 'cancelled')
         AND (
           (t.due_date IS NOT NULL AND t.due_date <= ?)
           OR (t.reminder_at IS NOT NULL AND t.reminder_at <= ?)
         )`,
    )
    .all(today, nowSql()) as Array<{
    id: number;
    title: string;
    due_date: string | null;
    reminder_at: string | null;
    priority: string;
    assignee: string | null;
  }>;

  for (const t of tasks) {
    const overdueTask = t.due_date && t.due_date < today;
    const n = ensureNotification({
      type: overdueTask ? 'danger' : 'info',
      title: overdueTask
        ? `Tâche en retard · ${t.title}`
        : `Rappel tâche · ${t.title}`,
      message: [
        t.due_date ? `Échéance : ${t.due_date}` : null,
        t.assignee ? `Responsable : ${t.assignee}` : null,
        `Priorité : ${t.priority}`,
      ]
        .filter(Boolean)
        .join(' · '),
      link: '/tasks',
      source_key: `task-alert-${t.id}-${t.due_date || t.reminder_at || today}`,
    });
    if (n) created += 1;
  }

  // Calendar event reminders
  const events = db
    .prepare(
      `SELECT id, title, starts_at, reminder_minutes
       FROM calendar_events
       WHERE reminder_minutes IS NOT NULL
         AND starts_at >= ?`,
    )
    .all(nowSql()) as Array<{
    id: number;
    title: string;
    starts_at: string;
    reminder_minutes: number;
  }>;

  const now = Date.now();
  for (const e of events) {
    const start = Date.parse(e.starts_at.includes('T') ? e.starts_at : `${e.starts_at}T00:00:00`);
    if (Number.isNaN(start)) continue;
    const remindAt = start - e.reminder_minutes * 60 * 1000;
    if (now < remindAt || now > start) continue;
    const n = ensureNotification({
      type: 'info',
      title: `Rappel rendez-vous · ${e.title}`,
      message: `Début : ${e.starts_at}`,
      link: '/calendar',
      source_key: `event-reminder-${e.id}-${e.starts_at}`,
    });
    if (n) created += 1;
  }

  return { created };
}

export function syncSmartNotifications(): void {
  void runSmartAlerts().catch(() => {
    /* ignore background errors */
  });
}
