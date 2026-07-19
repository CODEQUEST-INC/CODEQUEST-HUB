import { request } from './client';

export interface Cohort {
  id: string;
  name: string;
  year: number;
  active: boolean;
  createdAt: string;
}

// Public endpoint (no token needed) — the registration screen shows a cohort
// picker before the user has one; admin screens still pass a token, which is
// harmless since the route doesn't require it either way.
export function listCohorts(token?: string | null): Promise<Cohort[]> {
  return request<Cohort[]>('/api/cohorts', { token: token ?? undefined });
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

// Blocked (not cascaded) server-side if the cohort still has groups, students,
// judging criteria, or judges — the error message names exactly what's in the way.
export function deleteCohort(cohortId: string, token: string): Promise<void> {
  return request<void>(`/api/cohorts/${cohortId}`, { method: 'DELETE', token });
}
