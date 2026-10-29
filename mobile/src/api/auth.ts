/**
 * API tài khoản (UC01–03). AuthContext dùng file này; màn hình thì dùng useAuth(), không gọi trực tiếp.
 */
import { api } from './client';
import type { AuthResponse, AuthUser } from '../types/models';

export interface LoginBody {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterBody {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const authApi = {
  login: (body: LoginBody) => api.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  register: (body: RegisterBody) => api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
};
