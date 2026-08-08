import { api, toQuery } from './client';
import type { CalendarEvent, CalendarItem } from '../types';

export interface CalendarFeed {
  from: string;
  to: string;
  items: CalendarItem[];
}

export type CalendarEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean;
  client_id?: number | null;
  project_id?: number | null;
  reminder_minutes?: number | null;
};

export function fetchCalendar(params: { from?: string; to?: string } = {}) {
  return api.get<CalendarFeed>(`/api/calendar${toQuery(params)}`);
}

export function fetchCalendarEvents(params: { from?: string; to?: string } = {}) {
  return api.get<CalendarEvent[]>(`/api/calendar/events${toQuery(params)}`);
}

export function createCalendarEvent(body: CalendarEventInput) {
  return api.post<CalendarEvent>('/api/calendar/events', body);
}

export function updateCalendarEvent(id: number, body: CalendarEventInput) {
  return api.put<CalendarEvent>(`/api/calendar/events/${id}`, body);
}

export function deleteCalendarEvent(id: number) {
  return api.delete<{ ok: boolean }>(`/api/calendar/events/${id}`);
}
