import type { DatabaseSync } from 'node:sqlite';

const DEFAULTS: Record<string, string> = {
  company_name: 'NexBoard SAS',
  company_email: 'contact@nexboard.app',
  company_phone: '',
  company_address: '',
  company_tagline: 'Business OS',
  currency: 'EUR',
  theme: 'system',
  brand_color: '#0891B2',
  logo_url: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_secure: 'false',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: '',
  notify_email: 'false',
  locale: 'en',
};

export function ensureDefaultSettings(db: DatabaseSync): void {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
  );
  for (const [key, value] of Object.entries(DEFAULTS)) {
    insert.run(key, value);
  }
}
