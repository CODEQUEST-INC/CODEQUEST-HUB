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
