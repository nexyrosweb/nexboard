import { api, toQuery } from './client';
import type { Client } from '../types';

export type ClientInput = {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  status: Client['status'];
  notes?: string | null;
};

export function fetchClients(params: { q?: string; status?: string } = {}) {
  return api.get<Client[]>(`/api/clients${toQuery(params)}`);
}

export function createClient(body: ClientInput) {
  return api.post<Client>('/api/clients', body);
}

export function updateClient(id: number, body: ClientInput) {
  return api.put<Client>(`/api/clients/${id}`, body);
}

export function deleteClient(id: number) {
  return api.delete<{ ok: boolean }>(`/api/clients/${id}`);
}
