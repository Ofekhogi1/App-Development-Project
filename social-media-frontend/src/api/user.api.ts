import api from './axiosInstance';
import { User, AuthUser, PaginatedPosts } from '../types';

export interface UserProfileResponse {
  user: User;
  posts: PaginatedPosts['posts'];
  nextCursor: string | null;
  hasMore: boolean;
}

export const userApi = {
  getProfile: (id: string, cursor?: string) =>
    api
      .get<UserProfileResponse>(`/users/${id}`, { params: { cursor } })
      .then((r) => r.data),

  updateProfile: (id: string, formData: FormData) =>
    api.put<{ user: AuthUser }>(`/users/${id}`, formData).then((r) => r.data),

  changePassword: (id: string, currentPassword: string, newPassword: string) =>
    api
      .put<{ message: string }>(`/users/${id}/password`, { currentPassword, newPassword })
      .then((r) => r.data),
};
