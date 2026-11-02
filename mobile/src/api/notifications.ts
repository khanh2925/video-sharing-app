/**
 * API thông báo và chia sẻ video (UC20), đều cần đăng nhập.
 */
import { api } from './client';
import type { AppNotification, PageResponse } from '../types/models';

export const notificationApi = {
  list: (page = 0, size = 20) =>
    api.get<PageResponse<AppNotification>>('/notifications', { params: { page, size } }).then((r) => r.data),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),
  readAll: () => api.put('/notifications/read-all'),
  read: (id: number) => api.put(`/notifications/${id}/read`),
  /** Chia sẻ video cho bạn bè, trả về số người đã gửi được */
  share: (videoId: number, userIds: number[], message?: string) =>
    api.post<{ sent: number }>(`/videos/${videoId}/share`, { userIds, message }).then((r) => r.data.sent),
};
