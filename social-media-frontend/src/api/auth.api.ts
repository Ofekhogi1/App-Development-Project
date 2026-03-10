import api from './axiosInstance';
import { AuthUser } from '../types';

export interface LoginPayload {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  refresh: () => api.post<AuthResponse>('/auth/refresh').then((r) => r.data),

  getMe: () => api.get<{ user: AuthUser }>('/auth/me').then((r) => r.data),
};
