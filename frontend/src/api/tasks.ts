import { request } from './client';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface TaskResponse {
  id: string;
  groupId: string;
  proposalId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: string | null;
  createdBy: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
}

export function createTask(req: CreateTaskRequest, token: string): Promise<TaskResponse> {
  return request<TaskResponse>('/api/tasks', { method: 'POST', body: req, token });
}

export function listTasksForGroup(groupId: string, token: string): Promise<TaskResponse[]> {
  return request<TaskResponse[]>(`/api/tasks/group/${groupId}`, { token });
}

export function updateTask(taskId: string, req: UpdateTaskRequest, token: string): Promise<TaskResponse> {
  return request<TaskResponse>(`/api/tasks/${taskId}`, { method: 'PATCH', body: req, token });
}

export function assignTask(taskId: string, userId: string, token: string): Promise<TaskResponse> {
  return request<TaskResponse>(`/api/tasks/${taskId}/assign`, { method: 'PATCH', body: { userId }, token });
}

export function updateTaskStatus(taskId: string, status: TaskStatus, token: string): Promise<TaskResponse> {
  return request<TaskResponse>(`/api/tasks/${taskId}/status`, { method: 'PATCH', body: { status }, token });
}

export function deleteTask(taskId: string, token: string): Promise<void> {
  return request<void>(`/api/tasks/${taskId}`, { method: 'DELETE', token });
}
