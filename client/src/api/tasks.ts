import { api, toQuery } from './client';
import type { Task } from '../types';

export type TaskInput = {
  title: string;
  description?: string | null;
  status: Task['status'];
  priority: Task['priority'];
  due_date?: string | null;
  reminder_at?: string | null;
  assignee?: string | null;
  client_id?: number | null;
  project_id?: number | null;
};

export function fetchTasks(
  params: { q?: string; status?: string; priority?: string; today?: string } = {},
) {
  return api.get<Task[]>(`/api/tasks${toQuery(params)}`);
}

export function fetchTasksToday() {
  return api.get<Task[]>('/api/tasks/today');
}

export function createTask(body: TaskInput) {
  return api.post<Task>('/api/tasks', body);
}

export function updateTask(id: number, body: TaskInput) {
  return api.put<Task>(`/api/tasks/${id}`, body);
}

export function deleteTask(id: number) {
  return api.delete<{ ok: boolean }>(`/api/tasks/${id}`);
}
