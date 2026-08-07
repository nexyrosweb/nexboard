import { api, toQuery } from './client';
import type { Quote } from '../types';

export type QuoteInput = {
  client_id: number;
  project_id?: number | null;
  number?: string;
  title: string;
  amount: number;
  status: Quote['status'];
  issue_date: string;
  valid_until?: string | null;
};

export function fetchQuotes(params: { q?: string; status?: string } = {}) {
  return api.get<Quote[]>(`/api/quotes${toQuery(params)}`);
}

export function createQuote(body: QuoteInput) {
  return api.post<Quote>('/api/quotes', body);
}

export function updateQuote(id: number, body: QuoteInput) {
  return api.put<Quote>(`/api/quotes/${id}`, body);
}

export function deleteQuote(id: number) {
  return api.delete<{ ok: boolean }>(`/api/quotes/${id}`);
}

export function sendQuote(id: number) {
  return api.post<Quote>(`/api/quotes/${id}/send`, {});
}
