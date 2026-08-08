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

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: 'actif' | 'prospect' | 'inactif';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  client_id: number;
  client_name: string;
  name: string;
  description: string | null;
  status: 'brouillon' | 'en_cours' | 'termine' | 'annule';
  budget: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: number;
  client_id: number;
  client_name: string;
  project_id: number | null;
  project_name: string | null;
  number: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  issue_date: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  client_id: number;
  client_name: string;
  project_id: number | null;
  project_name: string | null;
  quote_id: number | null;
  number: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  reminder_at: string | null;
  assignee: string | null;
  client_id: number | null;
  project_id: number | null;
  client_name: string | null;
  project_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean | number;
  client_id: number | null;
  project_id: number | null;
  task_id: number | null;
  reminder_minutes: number | null;
  client_name: string | null;
  project_name: string | null;
  created_at: string;
  updated_at: string;
}

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

export interface AppNotification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  link: string | null;
  read: number;
  source_key?: string | null;
  created_at: string;
}

export type AppSettings = Record<string, string | boolean | undefined>;

export type Option = { value: string; label: string };

export interface DashboardLayout {
  order: string[];
  hidden: string[];
}

export type ImportEntity = 'clients' | 'projects';

export interface ImportPreviewRow {
  index: number;
  data: Record<string, string>;
  status: 'ok' | 'duplicate' | 'error';
  message?: string;
}

export interface ImportPreviewResponse {
  entity: string;
  total: number;
  ok: number;
  duplicates: number;
  errors: number;
  rows: ImportPreviewRow[];
}

export interface ImportConfirmResponse {
  entity: string;
  imported: number;
  skipped: number;
}
