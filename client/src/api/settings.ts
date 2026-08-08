import { api } from './client';
import type {
  AppSettings,
  ImportConfirmResponse,
  ImportEntity,
  ImportPreviewResponse,
} from '../types';

export function fetchSettings() {
  return api.get<AppSettings>('/api/settings');
}

export function saveSettings(body: AppSettings) {
  return api.put<AppSettings>('/api/settings', body);
}

export async function uploadLogo(file: File) {
  const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE}/api/settings/logo`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    try {
      const payload = JSON.parse(text) as { error?: string };
      throw new Error(payload.error || text);
    } catch (err) {
      if (err instanceof Error && err.message !== text) throw err;
      throw new Error(text || 'Upload impossible');
    }
  }
  return response.json() as Promise<AppSettings>;
}

export function deleteLogo() {
  return api.delete<AppSettings>('/api/settings/logo');
}

export function testSmtp(to?: string) {
  return api.post<{ ok: boolean; to: string }>('/api/settings/smtp/test', { to });
}

export function downloadExport(
  entity: string,
  range?: { from?: string; to?: string },
) {
  const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
  const params = new URLSearchParams();
  if (range?.from) params.set('from', range.from);
  if (range?.to) params.set('to', range.to);
  const qs = params.toString();
  window.open(`${API_BASE}/api/export/${entity}${qs ? `?${qs}` : ''}`, '_blank');
}

export function downloadBackup() {
  const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
  window.open(`${API_BASE}/api/backup`, '_blank');
}

export function previewImport(entity: ImportEntity, csv: string) {
  return api.post<ImportPreviewResponse>(`/api/import/${entity}`, { csv });
}

export function confirmImport(entity: ImportEntity, csv: string) {
  return api.post<ImportConfirmResponse>(`/api/import/${entity}`, { csv, confirm: true });
}
