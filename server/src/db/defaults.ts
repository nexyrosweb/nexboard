import type { DatabaseSync } from 'node:sqlite';

const DEFAULT_CLIENT = ['actif', 'prospect', 'inactif'];
const DEFAULT_PROJECT = ['brouillon', 'en_cours', 'termine', 'annule'];
const DEFAULT_QUOTE = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire'];
const DEFAULT_INVOICE = ['brouillon', 'envoyee', 'payee', 'en_retard', 'annulee'];

export const BUILTIN_STATUSES = {
  clients: DEFAULT_CLIENT,
  projects: DEFAULT_PROJECT,
  quotes: DEFAULT_QUOTE,
  invoices: DEFAULT_INVOICE,
} as const;

export type StatusEntity = keyof typeof BUILTIN_STATUSES;

const DEFAULTS: Record<string, string> = {
  company_name: 'NexBoard SAS',
  company_email: 'contact@nexboard.app',
  company_phone: '',
  company_address: '',
  company_tagline: 'Business OS',
  currency: 'EUR',
  currencies: 'EUR,USD,GBP,CHF,CAD,JPY',
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
  reminder_enabled: 'true',
  reminder_email: 'true',
  reminder_interval_hours: '24',
  statuses_clients: JSON.stringify(DEFAULT_CLIENT),
  statuses_projects: JSON.stringify(DEFAULT_PROJECT),
  statuses_quotes: JSON.stringify(DEFAULT_QUOTE),
  statuses_invoices: JSON.stringify(DEFAULT_INVOICE),
  quote_number_format: 'DEV-{YYYY}-{###}',
  invoice_number_format: 'FAC - {YYYY} - {###}',
  dashboard_layout: JSON.stringify({
    order: [
      'revenueMonth',
      'unpaid',
      'projectsActive',
      'newClients',
      'conversion',
      'revenueChart',
      'activity',
      'tasksToday',
    ],
    hidden: [],
  }),
  alert_quote_days: '7',
  alert_project_days: '7',
};

export function ensureDefaultSettings(db: DatabaseSync): void {
  const insert = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const [key, value] of Object.entries(DEFAULTS)) {
    insert.run(key, value);
  }
}

export { DEFAULTS };
