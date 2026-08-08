import { api } from './client';
import type { AppNotification } from '../types';

export interface NotificationsResponse {
  items: AppNotification[];
  unread: number;
}

export function fetchNotifications(limit = 50) {
  return api.get<NotificationsResponse>(`/api/notifications?limit=${limit}`);
}

export function markNotificationRead(id: number) {
  return api.post<{ ok: boolean; unread: number }>(`/api/notifications/${id}/read`, {});
}

export function markAllNotificationsRead() {
  return api.post<{ ok: boolean; unread: number }>('/api/notifications/read-all', {});
}
