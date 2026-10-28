/**
 * API livestream (UC13 phát, UC14 xem). Live là giả lập: phát lặp một video có sẵn của người phát (R12).
 *
 * Chat và thả tim đi qua WebSocket STOMP, xem connectLive() ở dưới:
 *   const conn = connectLive(liveId, token, (e) => { ...cập nhật state theo e.event... });
 *   if (!conn.chat('Xin chào')) { ...chưa kết nối xong, giữ lại tin nhắn... }
 *   conn.react('heart');           // backend chỉ nhận 'heart' | 'like' | 'smile'
 *   return () => conn.close();   // trong useEffect
 */
import { Client } from '@stomp/stompjs';
import { api } from './client';
import { API_URL } from '../constants/config';
import type { LiveMessage, LiveSocketEvent, LiveStream } from '../types/models';

export interface CreateLiveBody {
  title: string;
  sourceVideoId: number;
  productName?: string;
  productPrice?: number;
  productImageUrl?: string;
}

export const liveApi = {
  active: () => api.get<LiveStream[]>('/lives').then((r) => r.data),
  getById: (id: number) => api.get<LiveStream>(`/lives/${id}`).then((r) => r.data),
  messages: (id: number) => api.get<LiveMessage[]>(`/lives/${id}/messages`).then((r) => r.data),
  create: (body: CreateLiveBody) => api.post<LiveStream>('/lives', body).then((r) => r.data),
  end: (id: number) => api.post<LiveStream>(`/lives/${id}/end`).then((r) => r.data),
};

/** http://192.168.1.5:8080 → ws://192.168.1.5:8080/ws */
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

/** Độ dài tối đa 1 tin nhắn chat live, khớp LIVE_MESSAGE_MAX ở backend */
export const LIVE_MESSAGE_MAX = 300;

/** Loại tim backend chấp nhận (LiveStreamService.sendMessage) */
export type LiveReaction = 'heart' | 'like' | 'smile';

export interface ConnectLiveOptions {
  /** false: không gửi /join (người phát không tính là người xem). Mặc định true. */
  join?: boolean;
  /** Backend báo lỗi riêng cho mình qua /user/queue/errors (vd tin nhắn quá dài) */
  onError?: (message: string) => void;
}

/**
 * Mở kết nối tới phòng live. token = null (khách) vẫn nghe được chat nhưng không gửi được.
 * onEvent nhận mọi sự kiện: COMMENT, REACTION, VIEWERS (số người xem), ENDED (live kết thúc).
 * chat() / react() trả về false nếu chưa kết nối xong → màn hình giữ lại tin nhắn và báo cho người dùng.
 */
export function connectLive(
  liveId: number,
  token: string | null,
  onEvent: (e: LiveSocketEvent) => void,
  options: ConnectLiveOptions = {},
) {
  const { join = true, onError } = options;
  const client = new Client({
    brokerURL: WS_URL,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    // 2 dòng này bắt buộc khi chạy STOMP trên React Native
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    onConnect: () => {
      client.subscribe(`/topic/live/${liveId}`, (frame) => onEvent(JSON.parse(frame.body)));
      if (token) {
        // Lỗi riêng của mình, backend gửi dạng {status, message}
        client.subscribe('/user/queue/errors', (frame) => {
          try {
            const body = JSON.parse(frame.body) as { message?: string };
            onError?.(body.message ?? 'Có lỗi xảy ra, thử lại sau');
          } catch {
            onError?.('Có lỗi xảy ra, thử lại sau');
          }
        });
        if (join) client.publish({ destination: `/app/live/${liveId}/join` });
      }
    },
    // Máy chủ trả frame ERROR (vd token hỏng) → ghi log để dễ tìm lỗi
    onStompError: (frame) => {
      console.warn('[live] STOMP error:', frame.headers.message, frame.body);
    },
  });
  client.activate();

  const send = (action: 'chat' | 'react', content: string): boolean => {
    if (!client.connected) return false;
    client.publish({ destination: `/app/live/${liveId}/${action}`, body: JSON.stringify({ content }) });
    return true;
  };

  return {
    chat: (content: string) => send('chat', content),
    react: (content: LiveReaction) => send('react', content),
    close: () => {
      if (client.connected && token && join) client.publish({ destination: `/app/live/${liveId}/leave` });
      client.deactivate();
    },
  };
}
