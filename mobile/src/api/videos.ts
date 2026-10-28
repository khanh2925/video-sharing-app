/**
 * API video: xem (UC05), đăng (UC08), quản lý (UC10), thích và bình luận (UC11).
 * Màn hình gọi các hàm ở đây, không gõ thẳng đường dẫn '/videos/...' trong màn hình.
 */
import { api, postMultipart } from './client';
import type { Comment, PageResponse, Video, Visibility } from '../types/models';

/** Các field gửi riêng lẻ trong form (không gói thành 1 part JSON, Expo sẽ lỗi 415). */
export interface CreateVideoForm {
  file: Blob;
  thumbnail?: Blob;
  title: string;
  description?: string;
  /** cách nhau bằng dấu cách hoặc dấu phẩy: "dalat dulich" */
  hashtags?: string;
  topicId?: number;
  audioId?: number;
  filter?: string;
  visibility: Visibility;
  allowComments: boolean;
  /** true = lưu nháp, false = đăng luôn */
  draft: boolean;
}

/** Chỉ gửi field muốn đổi. Đăng bản nháp: { publish: true } */
export interface UpdateVideoBody {
  title?: string;
  description?: string;
  visibility?: Visibility;
  allowComments?: boolean;
  publish?: boolean;
}

export const videoApi = {
  trending: (page = 0, size = 10) =>
    api.get<PageResponse<Video>>('/videos/trending', { params: { page, size } }).then((r) => r.data),
  byTopic: (topicId: number, page = 0, size = 20) =>
    api.get<PageResponse<Video>>('/videos', { params: { topicId, page, size } }).then((r) => r.data),
  getById: (id: number) => api.get<Video>(`/videos/${id}`).then((r) => r.data),
  /** Tăng lượt xem, trả lại video mới */
  recordView: (id: number) => api.post<Video>(`/videos/${id}/view`).then((r) => r.data),

  create: (form: CreateVideoForm) => {
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      data.append(key, typeof value === 'object' ? value : String(value));
    });
    return postMultipart<Video>('/videos', data);
  },
  myDrafts: (page = 0, size = 10) =>
    api.get<PageResponse<Video>>('/videos/me/drafts', { params: { page, size } }).then((r) => r.data),
  update: (id: number, body: UpdateVideoBody) => api.put<Video>(`/videos/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/videos/${id}`),

  like: (id: number) => api.post(`/videos/${id}/like`),
  unlike: (id: number) => api.delete(`/videos/${id}/like`),

  comments: (videoId: number, page = 0) =>
    api.get<PageResponse<Comment>>(`/videos/${videoId}/comments`, { params: { page } }).then((r) => r.data),
  addComment: (videoId: number, content: string) =>
    api.post<Comment>(`/videos/${videoId}/comments`, { content }).then((r) => r.data),
  removeComment: (commentId: number) => api.delete(`/comments/${commentId}`),
  likeComment: (commentId: number) => api.post(`/comments/${commentId}/like`),
  unlikeComment: (commentId: number) => api.delete(`/comments/${commentId}/like`),
};
