import api from './axiosInstance';
import { SearchResult } from '../types';

export const aiApi = {
  search: (query: string, cursor?: string, limit = 10) =>
    api
      .post<SearchResult>('/ai/search', { query, cursor, limit })
      .then((r) => r.data),

  generateImage: (text: string) =>
    api
      .post<{ imageBase64: string }>('/ai/generate-image', { text })
      .then((r) => r.data),

  generateCaption: (imageFile: File) => {
    const fd = new FormData();
    fd.append('image', imageFile);
    return api
      .post<{ caption: string }>('/ai/generate-caption', fd)
      .then((r) => r.data);
  },
};
