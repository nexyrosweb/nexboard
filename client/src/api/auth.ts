import { api } from './client';

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

export type AuthStatus = {
  authEnabled: boolean;
  setupRequired: boolean;
  user: AuthUser | null;
};

export const authApi = {
  status: () => api.get<AuthStatus>('/api/auth/status'),
  me: () => api.get<{ authEnabled: boolean; user: AuthUser | null }>('/api/auth/me'),
  setup: (body: { email: string; name: string; password: string }) =>
    api.post<{ user: AuthUser }>('/api/auth/setup', body),
  login: (body: { email: string; password: string }) =>
    api.post<{ user: AuthUser }>('/api/auth/login', body),
  logout: () => api.post<{ ok: boolean }>('/api/auth/logout', {}),
};
