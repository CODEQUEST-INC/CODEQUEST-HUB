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

export interface CreateCohortRequest {
  name: string;
  year: number;
}

export interface UpdateCohortRequest {
  name: string;
  year: number;
  active: boolean;
}

export function createCohort(req: CreateCohortRequest, token: string): Promise<Cohort> {
  return request<Cohort>('/api/cohorts', { method: 'POST', body: req, token });
}

export function updateCohort(cohortId: string, req: UpdateCohortRequest, token: string): Promise<Cohort> {
  return request<Cohort>(`/api/cohorts/${cohortId}`, { method: 'PATCH', body: req, token });
}
