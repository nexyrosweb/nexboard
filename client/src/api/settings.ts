import { api } from './client';
import type { AppSettings } from '../types';

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

export function downloadExport(entity: string) {
  const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
  window.open(`${API_BASE}/api/export/${entity}`, '_blank');
}

export function downloadBackup() {
  const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
  window.open(`${API_BASE}/api/backup`, '_blank');
}
