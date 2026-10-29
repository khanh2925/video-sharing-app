/**
 * API story (UC17 đăng, UC18 xem). Cả 4 API đều cần đăng nhập.
 */
import { api, postMultipart } from './client';
import type { Story, StoryGroup } from '../types/models';

export const storyApi = {
  /** Story của mình và người mình theo dõi, gom theo từng người. Nhóm của mình có mine = true. */
  feed: () => api.get<StoryGroup[]>('/stories/feed').then((r) => r.data),
  /** audioId: nhạc nền chọn ở màn Chọn nhạc (không bắt buộc) */
  create: (file: Blob, durationSec: number, audioId?: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('durationSec', String(durationSec));
    if (audioId) form.append('audioId', String(audioId));
    return postMultipart<Story>('/stories', form);
  },
  remove: (id: number) => api.delete(`/stories/${id}`),
  markViewed: (id: number) => api.post(`/stories/${id}/view`),
};
