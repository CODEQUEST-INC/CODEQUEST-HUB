import { request } from './client';

export interface Cohort {
  id: string;
  name: string;
  year: number;
  active: boolean;
  createdAt: string;
}

export function listCohorts(token: string): Promise<Cohort[]> {
  return request<Cohort[]>('/api/cohorts', { token });
}
