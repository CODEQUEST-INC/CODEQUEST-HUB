import { request } from './client';

export type UserRole = 'student' | 'supervisor' | 'admin' | 'mentor';

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  studentId: string | null;
  indexNumber: string | null;
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
