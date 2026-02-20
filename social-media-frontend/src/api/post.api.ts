import api from './axiosInstance';
import { Post, PaginatedPosts } from '../types';

export const postApi = {
  getFeed: (cursor?: string, limit = 10) =>
    api
      .get<PaginatedPosts>('/posts', { params: { cursor, limit } })
      .then((r) => r.data),

  getPost: (id: string) =>
    api.get<{ post: Post }>(`/posts/${id}`).then((r) => r.data),

  createPost: (formData: FormData) =>
    api.post<{ post: Post }>('/posts', formData).then((r) => r.data),

  updatePost: (id: string, formData: FormData) =>
    api.put<{ post: Post }>(`/posts/${id}`, formData).then((r) => r.data),

  deletePost: (id: string) => api.delete(`/posts/${id}`).then((r) => r.data),
};
