import { api, toQuery } from './client';
import type { Invoice } from '../types';

export type InvoiceInput = {
  client_id: number;
  project_id?: number | null;
  quote_id?: number | null;
  number?: string;
  title: string;
  amount: number;
  currency?: string;
  status: string;
  issue_date: string;
  due_date?: string | null;
  paid_at?: string | null;
};

export function fetchInvoices(params: {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
} = {}) {
  return api.get<Invoice[]>(`/api/invoices${toQuery(params)}`);
}

export function createInvoice(body: InvoiceInput) {
  return api.post<Invoice>('/api/invoices', body);
}

export function updateInvoice(id: number, body: InvoiceInput) {
  return api.put<Invoice>(`/api/invoices/${id}`, body);
}

export function deleteInvoice(id: number) {
  return api.delete<{ ok: boolean }>(`/api/invoices/${id}`);
}

export function sendInvoice(id: number) {
  return api.post<Invoice>(`/api/invoices/${id}/send`, {});
}
