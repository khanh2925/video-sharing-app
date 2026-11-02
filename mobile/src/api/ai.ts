/**
 * API tính năng AI: ghi hành vi xem, feed "Dành cho bạn", tìm kiếm theo ý nghĩa, trợ lý chat.
 * Lỗi 400 = AI chưa bật (hoặc thiếu từ khoá), 503 = AI hết lượt / đang bận → hiện getErrorMessage(e).
 */
import { api } from './client';
import type { Video } from '../types/models';

/** WATCH: xem từ 2 giây trở lên · SKIP: lướt qua nhanh · VIEW: backend tự ghi khi gọi /videos/{id}/view */
export type WatchEventType = 'WATCH' | 'SKIP' | 'VIEW';

export interface WatchEvent {
  videoId: number;
  type: WatchEventType;
  /** đã xem bao nhiêu mili giây */
  watchMs?: number;
  /** video dài bao nhiêu mili giây */
  durationMs?: number;
}

export interface ChatReply {
  /** câu trả lời, có thể có **chữ đậm** */
  reply: string;
  /** video trợ lý gợi ý kèm câu trả lời (có thể rỗng) */
  videos: Video[];
  /** số tin CŨ NHẤT trong history bị server bỏ vì vượt giới hạn token → xoá chừng ấy tin trên máy */
  trimmed: number;
}

/** Một tin cũ gửi kèm câu hỏi (cũ trước, mới sau) để trợ lý hiểu câu hỏi nối tiếp */
export interface ChatTurn {
  role: 'user' | 'bot';
  text: string;
}

export const aiApi = {
  /** Ghi 1 lần xem. Không bao giờ ném lỗi: ghi hụt 1 sự kiện thì thôi, không làm hỏng màn hình. */
  trackEvent: (event: WatchEvent): Promise<void> =>
    api.post('/events', event).then(() => undefined).catch(() => undefined),
  /** Video AI gợi ý theo gu của tôi. Cần đăng nhập. Mảng rỗng = chưa đủ dữ liệu. */
  forYou: () => api.get<Video[]>('/videos/me/for-you').then((r) => r.data),
  /** Tìm video theo ý nghĩa câu mô tả, không cần trùng từ khoá. Khách dùng được. */
  semanticSearch: (q: string) => api.get<Video[]>('/search/semantic', { params: { q } }).then((r) => r.data),
  /** Gửi 1 câu cho trợ lý (tối đa 500 ký tự) kèm lịch sử lưu trên máy. Cần đăng nhập. */
  chat: (message: string, history: ChatTurn[]) =>
    api.post<ChatReply>('/chat', { message, history }).then((r) => r.data),
};
