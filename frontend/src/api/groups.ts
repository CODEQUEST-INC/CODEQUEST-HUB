import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';
import { ApiError, request } from './client';

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
  photoUrl: string | null;
  createdAt: string;
  members: GroupMember[];
}

export function getMyGroup(token: string): Promise<GroupResponse> {
  return request<GroupResponse>('/api/groups/me', { token });
}

export function getGroupById(groupId: string, token: string): Promise<GroupResponse> {
  return request<GroupResponse>(`/api/groups/${groupId}`, { token });
}

export function listGroupsByCohort(cohortId: string, token: string): Promise<GroupResponse[]> {
  return request<GroupResponse[]>(`/api/groups?cohortId=${cohortId}`, { token });
}

export interface CreateGroupRequest {
  cohortId: string;
  groupNumber: number;
  name?: string;
  supervisorId?: string;
}

export function createGroup(req: CreateGroupRequest, token: string): Promise<GroupResponse> {
  return request<GroupResponse>('/api/groups', { method: 'POST', body: req, token });
}

export interface AutoGroupResult {
  groupsCreated: number;
  studentsGrouped: number;
  groups: GroupResponse[];
}

// Destructive: dissolves every existing group in the cohort and rebuilds
// them from scratch, chunking all registered students by index number.
export function autoGroupCohort(cohortId: string, groupSize: number, token: string): Promise<AutoGroupResult> {
  return request<AutoGroupResult>(`/api/groups/cohorts/${cohortId}/auto-group`, {
    method: 'POST',
    body: { groupSize },
    token,
  });
}

export function assignGroupMembers(
  groupId: string,
  userIds: string[],
  token: string
): Promise<{ added: number }> {
  return request<{ added: number }>(`/api/groups/${groupId}/members`, {
    method: 'POST',
    body: { userIds },
    token,
  });
}

export function setGroupLeader(groupId: string, userId: string, token: string): Promise<GroupResponse> {
  return request<GroupResponse>(`/api/groups/${groupId}/leader`, {
    method: 'PATCH',
    body: { userId },
    token,
  });
}

export function removeGroupMember(groupId: string, userId: string, token: string): Promise<GroupResponse> {
  return request<GroupResponse>(`/api/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export function updateGroupSupervisor(
  groupId: string,
  supervisorId: string | null,
  token: string
): Promise<GroupResponse> {
  return request<GroupResponse>(`/api/groups/${groupId}/supervisor`, {
    method: 'PATCH',
    body: { supervisorId },
    token,
  });
}

export function resolveGroupPhotoUrl(photoUrl: string | null): string | null {
  return photoUrl ? `${API_BASE_URL}${photoUrl}` : null;
}

// Multipart upload can't go through client.ts's request() — it always
// JSON-stringifies and sets Content-Type: application/json. FormData needs
// no manual Content-Type (RN/the browser set the multipart boundary itself).
export async function uploadGroupPhoto(
  groupId: string,
  file: { uri: string; name: string; type: string },
  token: string
): Promise<GroupResponse> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    // On web, expo-image-picker's uri is a blob: URL and FormData is the
    // browser's real implementation — it needs an actual Blob, not the
    // {uri, name, type} object RN's own FormData polyfill understands.
    const blob = await fetch(file.uri).then((r) => r.blob());
    formData.append('file', new Blob([blob], { type: file.type }), file.name);
  } else {
    formData.append('file', file as unknown as Blob);
  }

  const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message = json?.message ?? json?.error ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return json?.data as GroupResponse;
}

export function deleteGroupPhoto(groupId: string, token: string): Promise<GroupResponse> {
  return request<GroupResponse>(`/api/groups/${groupId}/photo`, { method: 'DELETE', token });
}
