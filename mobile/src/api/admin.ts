/**
 * API trang quản trị (chỉ ADMIN; người dùng thường gọi → 403):
 *  UC15 Kiểm duyệt video · UC16 Quản lý người dùng · UC19 Cấu hình hệ thống.
 */
import { api } from './client';
import type { AdminSetting, AdminStats, AdminUser, PageResponse, SettingKey, Video } from '../types/models';

export type AdminVideoFilter = 'ALL' | 'PUBLISHED' | 'HIDDEN';
export type AdminUserFilter = 'ALL' | 'ACTIVE' | 'LOCKED';

export const adminApi = {
  stats: () => api.get<AdminStats>('/admin/stats').then((r) => r.data),

  videos: (q: string, status: AdminVideoFilter, page = 0, size = 20) =>
    api.get<PageResponse<Video>>('/admin/videos', { params: { q, status, page, size } }).then((r) => r.data),
  hideVideo: (id: number) => api.put<Video>(`/admin/videos/${id}/hide`).then((r) => r.data),
  unhideVideo: (id: number) => api.put<Video>(`/admin/videos/${id}/unhide`).then((r) => r.data),

  users: (q: string, status: AdminUserFilter, page = 0, size = 20) =>
    api.get<PageResponse<AdminUser>>('/admin/users', { params: { q, status, page, size } }).then((r) => r.data),
  lockUser: (id: number) => api.put<AdminUser>(`/admin/users/${id}/lock`).then((r) => r.data),
  unlockUser: (id: number) => api.put<AdminUser>(`/admin/users/${id}/unlock`).then((r) => r.data),

  settings: () => api.get<AdminSetting[]>('/admin/settings').then((r) => r.data),
  updateSetting: (key: SettingKey, value: string) =>
    api.put<AdminSetting>(`/admin/settings/${key}`, { value }).then((r) => r.data),
};
