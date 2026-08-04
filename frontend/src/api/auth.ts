import { request } from './client';

export type UserRole = 'student' | 'supervisor' | 'admin' | 'mentor';

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  studentId: string | null;
  indexNumber: string | null;
  cohortId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role?: UserRole;
  studentId?: string;
  indexNumber?: string;
  cohortId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export function register(req: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', { method: 'POST', body: req });
}

export function login(req: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', { method: 'POST', body: req });
}

export function me(token: string): Promise<UserResponse> {
  return request<UserResponse>('/api/auth/me', { token });
}

export function changePassword(currentPassword: string, newPassword: string, token: string): Promise<void> {
  return request<void>('/api/auth/me/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
    token,
  });
}

// Always resolves the same way regardless of whether the email is
// registered — the backend deliberately doesn't reveal that either way.
export function forgotPassword(email: string): Promise<{ message: string }> {
  return request<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } });
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return request<void>('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } });
}
