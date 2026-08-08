import { getDb } from '../db/index.js';

export interface DashboardStats {
  clientsTotal: number;
  clientsActive: number;
  clientsNewMonth: number;
  projectsTotal: number;
  projectsActive: number;
  quotesPending: number;
  quotesTotal: number;
  quotesAccepted: number;
  quoteConversionRate: number;
  invoicesOutstanding: number;
  revenuePaid: number;
  revenuePending: number;
  revenueMonth: number;
  unpaidAmount: number;
  unpaidCount: number;
  tasksToday: number;
}

export interface DashboardTask {
  id: number;
  title: string;
  priority: string;
  due_date: string | null;
  status: string;
  assignee: string | null;
  client_name: string | null;
}

export interface RevenuePoint {
  month: string;
  label: string;
  paid: number;
  pending: number;
}

export interface StatusSlice {
  status: string;
  label: string;
  count: number;
  amount: number;
}

export interface ActivityItem {
  id: string;
  type: 'invoice' | 'quote' | 'project' | 'client';
  title: string;
  subtitle: string;
  amount: number | null;
  status: string;
  date: string;
}

export interface DashboardData {
  stats: DashboardStats;
  revenueByMonth: RevenuePoint[];
  invoicesByStatus: StatusSlice[];
  projectsByStatus: StatusSlice[];
  recentActivity: ActivityItem[];
  tasksToday: DashboardTask[];
}

const MONTH_LABELS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

const INVOICE_STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
  en_retard: 'En retard',
  annulee: 'Annulée',
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
};

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function buildLastMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }
  return months;
}

export function getDashboardData(): DashboardData {
  const db = getDb();

  const clientsTotal = (
    db.prepare('SELECT COUNT(*) AS c FROM clients').get() as { c: number }
  ).c;
  const clientsActive = (
    db.prepare(`SELECT COUNT(*) AS c FROM clients WHERE status = 'actif'`).get() as {
      c: number;
    }
  ).c;
  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
  const clientsNewMonth = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM clients WHERE date(created_at) >= ?`)
      .get(monthStart) as { c: number }
  ).c;
  const projectsTotal = (
    db.prepare('SELECT COUNT(*) AS c FROM projects').get() as { c: number }
  ).c;
  const projectsActive = (
    db.prepare(`SELECT COUNT(*) AS c FROM projects WHERE status = 'en_cours'`).get() as {
      c: number;
    }
  ).c;
  const quotesPending = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM quotes WHERE status IN ('brouillon', 'envoye')`)
      .get() as { c: number }
  ).c;
  const quotesTotal = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM quotes WHERE status != 'brouillon'`)
      .get() as { c: number }
  ).c;
  const quotesAccepted = (
    db.prepare(`SELECT COUNT(*) AS c FROM quotes WHERE status = 'accepte'`).get() as {
      c: number;
    }
  ).c;
  const quoteConversionRate =
    quotesTotal > 0 ? Math.round((quotesAccepted / quotesTotal) * 1000) / 10 : 0;
  const invoicesOutstanding = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM invoices WHERE status IN ('envoyee', 'en_retard')`,
      )
      .get() as { c: number }
  ).c;
  const revenuePaid = (
    db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM invoices WHERE status = 'payee'`)
      .get() as { s: number }
  ).s;
  const revenuePending = (
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS s FROM invoices WHERE status IN ('envoyee', 'en_retard')`,
      )
      .get() as { s: number }
  ).s;
  const revenueMonth = (
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS s FROM invoices
         WHERE status = 'payee' AND date(COALESCE(paid_at, updated_at)) >= ?`,
      )
      .get(monthStart) as { s: number }
  ).s;
  const unpaidRow = db
    .prepare(
      `SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS s FROM invoices
       WHERE status IN ('envoyee', 'en_retard')`,
    )
    .get() as { c: number; s: number };
  const tasksTodayCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM tasks
         WHERE status NOT IN ('done', 'cancelled')
           AND due_date IS NOT NULL AND due_date <= date('now')`,
      )
      .get() as { c: number }
  ).c;

  const months = buildLastMonths(6);
  const invoiceRows = db
    .prepare(
      `SELECT issue_date, amount, status FROM invoices WHERE status != 'annulee'`,
    )
    .all() as Array<{ issue_date: string; amount: number; status: string }>;

  const revenueMap = new Map<string, { paid: number; pending: number }>();
  months.forEach((m) => revenueMap.set(m, { paid: 0, pending: 0 }));

  for (const row of invoiceRows) {
    const key = monthKey(row.issue_date);
    const bucket = revenueMap.get(key);
    if (!bucket) continue;
    if (row.status === 'payee') bucket.paid += row.amount;
    else if (row.status === 'envoyee' || row.status === 'en_retard') {
      bucket.pending += row.amount;
    }
  }

  const revenueByMonth: RevenuePoint[] = months.map((m) => {
    const [, monthNum] = m.split('-');
    const values = revenueMap.get(m) ?? { paid: 0, pending: 0 };
    return {
      month: m,
      label: MONTH_LABELS[Number(monthNum) - 1],
      paid: values.paid,
      pending: values.pending,
    };
  });

  const invoicesByStatus = (
    db
      .prepare(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
         FROM invoices GROUP BY status ORDER BY amount DESC`,
      )
      .all() as Array<{ status: string; count: number; amount: number }>
  ).map((row) => ({
    status: row.status,
    label: INVOICE_STATUS_LABELS[row.status] ?? row.status,
    count: row.count,
    amount: row.amount,
  }));

  const projectsByStatus = (
    db
      .prepare(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(budget), 0) AS amount
         FROM projects GROUP BY status ORDER BY count DESC`,
      )
      .all() as Array<{ status: string; count: number; amount: number }>
  ).map((row) => ({
    status: row.status,
    label: PROJECT_STATUS_LABELS[row.status] ?? row.status,
    count: row.count,
    amount: row.amount,
  }));

  const recentInvoices = db
    .prepare(
      `SELECT i.id, i.number, i.title, i.amount, i.status, i.created_at, c.name AS client_name
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       ORDER BY i.created_at DESC LIMIT 4`,
    )
    .all() as Array<{
    id: number;
    number: string;
    title: string;
    amount: number;
    status: string;
    created_at: string;
    client_name: string;
  }>;

  const recentQuotes = db
    .prepare(
      `SELECT q.id, q.number, q.title, q.amount, q.status, q.created_at, c.name AS client_name
       FROM quotes q
       JOIN clients c ON c.id = q.client_id
       ORDER BY q.created_at DESC LIMIT 3`,
    )
    .all() as Array<{
    id: number;
    number: string;
    title: string;
    amount: number;
    status: string;
    created_at: string;
    client_name: string;
  }>;

  const recentProjects = db
    .prepare(
      `SELECT p.id, p.name, p.status, p.budget, p.created_at, c.name AS client_name
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       ORDER BY p.created_at DESC LIMIT 3`,
    )
    .all() as Array<{
    id: number;
    name: string;
    status: string;
    budget: number;
    created_at: string;
    client_name: string;
  }>;

  const recentActivity: ActivityItem[] = [
    ...recentInvoices.map((i) => ({
      id: `invoice-${i.id}`,
      type: 'invoice' as const,
      title: i.number,
      subtitle: `${i.client_name} · ${i.title}`,
      amount: i.amount,
      status: i.status,
      date: i.created_at,
    })),
    ...recentQuotes.map((q) => ({
      id: `quote-${q.id}`,
      type: 'quote' as const,
      title: q.number,
      subtitle: `${q.client_name} · ${q.title}`,
      amount: q.amount,
      status: q.status,
      date: q.created_at,
    })),
    ...recentProjects.map((p) => ({
      id: `project-${p.id}`,
      type: 'project' as const,
      title: p.name,
      subtitle: p.client_name,
      amount: p.budget,
      status: p.status,
      date: p.created_at,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  const tasksToday = db
    .prepare(
      `SELECT t.id, t.title, t.priority, t.due_date, t.status, t.assignee, c.name AS client_name
       FROM tasks t
       LEFT JOIN clients c ON c.id = t.client_id
       WHERE t.status NOT IN ('done', 'cancelled')
         AND t.due_date IS NOT NULL
         AND t.due_date <= date('now')
       ORDER BY
         CASE WHEN t.due_date < date('now') THEN 0 ELSE 1 END,
         CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         t.due_date ASC
       LIMIT 8`,
    )
    .all() as unknown as DashboardTask[];

  return {
    stats: {
      clientsTotal,
      clientsActive,
      clientsNewMonth,
      projectsTotal,
      projectsActive,
      quotesPending,
      quotesTotal,
      quotesAccepted,
      quoteConversionRate,
      invoicesOutstanding,
      revenuePaid,
      revenuePending,
      revenueMonth,
      unpaidAmount: unpaidRow.s,
      unpaidCount: unpaidRow.c,
      tasksToday: tasksTodayCount,
    },
    revenueByMonth,
    invoicesByStatus,
    projectsByStatus,
    recentActivity,
    tasksToday,
  };
}
