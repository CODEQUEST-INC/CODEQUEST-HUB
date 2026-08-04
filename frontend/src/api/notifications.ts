import { request } from './client';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function listMyNotifications(token: string): Promise<Notification[]> {
  return request<Notification[]>('/api/auth/notifications/mine', { token });
}

export function markNotificationRead(id: string, token: string): Promise<void> {
  return request<void>(`/api/auth/notifications/${id}/read`, { method: 'PATCH', token });
}
