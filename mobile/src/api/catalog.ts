/**
 * API danh mục và tìm kiếm: chủ đề, nhạc (UC09), tìm kiếm (UC04), hồ sơ người dùng (UC06).
 */
import { api } from './client';
import type { Audio, PageResponse, SearchResponse, SearchType, Topic, UserProfile, Video } from '../types/models';

export const catalogApi = {
  topics: () => api.get<Topic[]>('/topics').then((r) => r.data),
  audios: () => api.get<Audio[]>('/audios').then((r) => r.data),
};

export const searchApi = {
  /** type: videos | trending | accounts | streaming | audio. Kiểu phần tử trong content tuỳ theo type. */
  search: <T>(q: string, type: SearchType, page = 0, size = 20) =>
    api.get<SearchResponse<T>>('/search', { params: { q, type, page, size } }).then((r) => r.data),
  suggestions: (q: string) => api.get<string[]>('/search/suggestions', { params: { q } }).then((r) => r.data),
};

export const userApi = {
  profile: (id: number) => api.get<UserProfile>(`/users/${id}`).then((r) => r.data),
  videos: (id: number, page = 0, size = 12) =>
    api.get<PageResponse<Video>>(`/users/${id}/videos`, { params: { page, size } }).then((r) => r.data),
  liked: (id: number, page = 0, size = 12) =>
    api.get<PageResponse<Video>>(`/users/${id}/liked`, { params: { page, size } }).then((r) => r.data),
  // TODO (Long, UC07 + UC12): backend chưa có API sửa hồ sơ, theo dõi / bỏ theo dõi, danh sách bạn bè.
  // Khi có thì thêm hàm ở đây, ví dụ:
  //   follow: (id: number) => api.post(`/users/${id}/follow`),
};
