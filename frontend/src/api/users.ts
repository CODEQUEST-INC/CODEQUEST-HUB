import { request } from './client';

export interface UserSummary {
  id: string;
  fullName: string;
}

export function lookupUsers(ids: string[], token: string): Promise<UserSummary[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return request<UserSummary[]>(`/api/auth/users?ids=${ids.join(',')}`, { token });
}

export interface UserSearchResult {
  id: string;
  fullName: string;
  role: string;
}

export function searchUsers(query: string, token: string, role?: string): Promise<UserSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (role) params.set('role', role);
  return request<UserSearchResult[]>(`/api/auth/users/search?${params.toString()}`, { token });
}

export function deleteUser(userId: string, token: string): Promise<void> {
  return request<void>(`/api/auth/users/${userId}`, { method: 'DELETE', token });
}

export interface UsersStats {
  totalUsers: number;
  studentCount: number;
  supervisorCount: number;
  adminCount: number;
  mentorCount: number;
  totalGroups: number;
  groupsWithoutSupervisor: number;
  totalJudgeAssignments: number;
}

export function getUsersStats(token: string): Promise<UsersStats> {
  return request<UsersStats>('/api/auth/users/stats', { token });
}
