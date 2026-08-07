export interface DashboardStats {
  clientsTotal: number;
  clientsActive: number;
  projectsTotal: number;
  projectsActive: number;
  quotesPending: number;
  invoicesOutstanding: number;
  revenuePaid: number;
  revenuePending: number;
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
  status: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';
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
  status: 'brouillon' | 'envoyee' | 'payee' | 'en_retard' | 'annulee';
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AppSettings = Record<string, string | boolean | undefined>;

export type Option = { value: string; label: string };
