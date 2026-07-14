import { request } from './client';

export interface UserSummary {
  id: string;
  fullName: string;
}

export function lookupUsers(ids: string[], token: string): Promise<UserSummary[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return request<UserSummary[]>(`/api/auth/users?ids=${ids.join(',')}`, { token });
}
