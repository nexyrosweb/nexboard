import { api, toQuery } from './client';
import type { Project } from '../types';

export type ProjectInput = {
  client_id: number;
  name: string;
  description?: string | null;
  status: Project['status'];
  budget: number;
  start_date?: string | null;
  end_date?: string | null;
};

export function fetchProjects(params: { q?: string; status?: string } = {}) {
  return api.get<Project[]>(`/api/projects${toQuery(params)}`);
}

export function createProject(body: ProjectInput) {
  return api.post<Project>('/api/projects', body);
}

export function updateProject(id: number, body: ProjectInput) {
  return api.put<Project>(`/api/projects/${id}`, body);
}

export function deleteProject(id: number) {
  return api.delete<{ ok: boolean }>(`/api/projects/${id}`);
}
