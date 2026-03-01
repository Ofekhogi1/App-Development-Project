import api from './axiosInstance';

export const likeApi = {
  toggleLike: (postId: string) =>
    api
      .post<{ liked: boolean; likeCount: number }>(`/likes/${postId}`)
      .then((r) => r.data),

  getLikeStatus: (postId: string) =>
    api
      .get<{ liked: boolean; likeCount: number }>(`/likes/${postId}/status`)
      .then((r) => r.data),
};
