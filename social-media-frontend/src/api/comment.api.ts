import api from './axiosInstance';
import { Comment } from '../types';

export const commentApi = {
  getComments: (postId: string) =>
    api.get<{ comments: Comment[] }>(`/comments/${postId}`).then((r) => r.data),

  addComment: (postId: string, text: string) =>
    api.post<{ comment: Comment }>(`/comments/${postId}`, { text }).then((r) => r.data),

  deleteComment: (id: string) => api.delete(`/comments/${id}`).then((r) => r.data),
};
