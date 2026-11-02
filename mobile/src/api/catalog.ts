/**
 * API danh mục và tìm kiếm: chủ đề, nhạc (UC09), tìm kiếm (UC04),
 * hồ sơ người dùng (UC06), sửa thông tin cá nhân (UC07), theo dõi (UC12).
 */
import { api, postMultipart } from './client';
import type { Audio, AuthUser, FollowUser, PageResponse, SearchResponse, SearchType, Topic, UserProfile, Video } from '../types/models';

export const catalogApi = {
  topics: () => api.get<Topic[]>('/topics').then((r) => r.data),
  audios: () => api.get<Audio[]>('/audios').then((r) => r.data),
  audio: (id: number) => api.get<Audio>(`/audios/${id}`).then((r) => r.data),
  /** Video công khai đang dùng bài nhạc này, nhiều lượt xem trước (màn Âm thanh) */
  audioVideos: (id: number, page = 0, size = 18) =>
    api.get<PageResponse<Video>>(`/audios/${id}/videos`, { params: { page, size } }).then((r) => r.data),
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
  followers: (id: number, page = 0, size = 20) =>
    api.get<PageResponse<FollowUser>>(`/users/${id}/followers`, { params: { page, size } }).then((r) => r.data),
  following: (id: number, page = 0, size = 20) =>
    api.get<PageResponse<FollowUser>>(`/users/${id}/following`, { params: { page, size } }).then((r) => r.data),
  /** Cần đăng nhập */
  suggestions: (size = 10) => api.get<FollowUser[]>('/users/suggestions', { params: { size } }).then((r) => r.data),
  follow: (id: number) => api.post(`/users/${id}/follow`),
  unfollow: (id: number) => api.delete(`/users/${id}/follow`),

  // UC07: sửa thông tin của chính mình, trả về AuthUser mới → gọi updateUser() của useAuth()
  updateMe: (body: { displayName: string; bio: string }) => api.put<AuthUser>('/users/me', body).then((r) => r.data),
  updateAvatar: (file: Blob) => {
    const form = new FormData();
    form.append('file', file);
    return postMultipart<AuthUser>('/users/me/avatar', form);
  },
};
