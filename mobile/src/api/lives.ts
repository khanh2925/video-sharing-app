/**
 * API livestream (UC13 phát, UC14 xem). Live là giả lập: phát lặp một video có sẵn của người phát (R12).
 *
 * Chat và thả tim đi qua WebSocket STOMP, xem connectLive() ở dưới:
 *   const conn = connectLive(liveId, token, (e) => { ...cập nhật state theo e.event... });
 *   conn.chat('Xin chào');  conn.react('❤️');
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

/**
 * Mở kết nối tới phòng live. token = null (khách) vẫn nghe được chat nhưng không gửi được.
 * onEvent nhận mọi sự kiện: COMMENT, REACTION, VIEWERS (số người xem), ENDED (live kết thúc).
 */
export function connectLive(liveId: number, token: string | null, onEvent: (e: LiveSocketEvent) => void) {
  const client = new Client({
    brokerURL: WS_URL,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    // 2 dòng này bắt buộc khi chạy STOMP trên React Native
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    onConnect: () => {
      client.subscribe(`/topic/live/${liveId}`, (frame) => onEvent(JSON.parse(frame.body)));
      if (token) client.publish({ destination: `/app/live/${liveId}/join` });
    },
  });
  client.activate();

  const send = (action: 'chat' | 'react', content: string) => {
    if (!client.connected) return;
    client.publish({ destination: `/app/live/${liveId}/${action}`, body: JSON.stringify({ content }) });
  };

  return {
    chat: (content: string) => send('chat', content),
    react: (content: string) => send('react', content),
    close: () => {
      if (client.connected && token) client.publish({ destination: `/app/live/${liveId}/leave` });
      client.deactivate();
    },
  };
}
