import { request } from './client';

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
}

export interface GroupResponse {
  id: string;
  cohortId: string;
  groupNumber: number;
  name: string | null;
  supervisorId: string | null;
  groupLeaderId: string | null;
  createdAt: string;
  members: GroupMember[];
}

export function getMyGroup(token: string): Promise<GroupResponse> {
  return request<GroupResponse>('/api/groups/me', { token });
}
