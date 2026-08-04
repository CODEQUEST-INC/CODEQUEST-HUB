import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';
import { ApiError, request } from './client';

export interface ShowcasePhoto {
  id: string;
  url: string;
}

export interface ShowcaseEntryResponse {
  id: string;
  groupId: string;
  groupNumber: number | null;
  groupName: string | null;
  cohortId: string;
  title: string;
  description: string;
  githubUrl: string;
  photos: ShowcasePhoto[];
  score: number | null;
  rank: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertShowcaseRequest {
  title: string;
  description: string;
  githubUrl: string;
}

export function listShowcaseEntries(cohortId?: string): Promise<ShowcaseEntryResponse[]> {
  const query = cohortId ? `?cohortId=${cohortId}` : '';
  return request<ShowcaseEntryResponse[]>(`/api/showcase${query}`);
}

export function getShowcaseEntry(groupId: string): Promise<ShowcaseEntryResponse> {
  return request<ShowcaseEntryResponse>(`/api/showcase/${groupId}`);
}

export function upsertShowcaseEntry(
  groupId: string,
  req: UpsertShowcaseRequest,
  token: string
): Promise<ShowcaseEntryResponse> {
  return request<ShowcaseEntryResponse>(`/api/showcase/${groupId}`, { method: 'POST', body: req, token });
}

// Multipart upload can't go through client.ts's request() — it always
// JSON-stringifies and sets Content-Type: application/json. FormData needs
// no manual Content-Type (RN/the browser set the multipart boundary itself).
export async function addShowcasePhoto(
  groupId: string,
  file: { uri: string; name: string; type: string },
  token: string
): Promise<ShowcaseEntryResponse> {
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

  const res = await fetch(`${API_BASE_URL}/api/showcase/${groupId}/photo`, {
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
  return json?.data as ShowcaseEntryResponse;
}

export function deleteShowcasePhoto(groupId: string, photoId: string, token: string): Promise<ShowcaseEntryResponse> {
  return request<ShowcaseEntryResponse>(`/api/showcase/${groupId}/photo/${photoId}`, { method: 'DELETE', token });
}

export function setCoverPhoto(groupId: string, photoId: string, token: string): Promise<ShowcaseEntryResponse> {
  return request<ShowcaseEntryResponse>(`/api/showcase/${groupId}/photo/${photoId}/cover`, {
    method: 'PATCH',
    token,
  });
}

export function deleteShowcaseEntry(groupId: string, token: string): Promise<void> {
  return request<void>(`/api/showcase/${groupId}`, { method: 'DELETE', token });
}

export function resolvePhotoUrl(photoUrl: string | null): string | null {
  return photoUrl ? `${API_BASE_URL}${photoUrl}` : null;
}
