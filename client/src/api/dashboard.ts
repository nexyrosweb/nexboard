import { api } from './client';
import type { DashboardData } from '../types';

export function fetchDashboard(): Promise<DashboardData> {
  return api.get<DashboardData>('/api/dashboard');
}
