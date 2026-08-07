import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(__dirname, '../..');
export const uploadsDir = path.resolve(serverRoot, 'data', 'uploads');

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: number;
  created_at: string;
}

export function getSetting(key: string, fallback = ''): string {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function getSettingsMap(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as Array<{
    key: string;
    value: string;
  }>;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, value);
}

export function createNotification(input: {
  type?: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}): Notification {
  const result = getDb()
    .prepare(
      `INSERT INTO notifications (type, title, message, link)
       VALUES (?, ?, ?, ?)`,
    )
    .run(input.type ?? 'info', input.title, input.message, input.link ?? null);

  return getDb()
    .prepare('SELECT * FROM notifications WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as unknown as Notification;
}

export function listNotifications(limit = 30): Notification[] {
  return getDb()
    .prepare(
      `SELECT * FROM notifications ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .all(limit) as unknown as Notification[];
}

export function unreadCount(): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS c FROM notifications WHERE read = 0`)
    .get() as { c: number };
  return row.c;
}

export function markNotificationRead(id: number): boolean {
  const result = getDb()
    .prepare(`UPDATE notifications SET read = 1 WHERE id = ?`)
    .run(id);
  return result.changes > 0;
}

export function markAllNotificationsRead(): void {
  getDb().prepare(`UPDATE notifications SET read = 1 WHERE read = 0`).run();
}

export function syncOverdueNotifications(): void {
  const overdue = getDb()
    .prepare(
      `SELECT i.id, i.number, i.title, c.name AS client_name
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE i.status = 'en_retard'`,
    )
    .all() as Array<{ id: number; number: string; title: string; client_name: string }>;

  const exists = getDb().prepare(
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
