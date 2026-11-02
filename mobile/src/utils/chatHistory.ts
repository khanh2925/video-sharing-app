/**
 * Lịch sử chat với Trợ lý AI, lưu TRÊN MÁY theo từng tài khoản (key "vsa_chat_<userId>").
 * AsyncStorage: điện thoại (Expo Go, APK) lưu vào bộ nhớ app; bản web tự dùng localStorage của trình duyệt.
 * Server không lưu gì: mỗi lần hỏi app gửi kèm lịch sử, server cắt theo giới hạn token và báo lại
 * số tin cũ đã bỏ (trimmed) → app xoá đúng chừng ấy tin ở đây.
 * Mất khi: bấm "Xoá lịch sử", xoá dữ liệu app / trình duyệt, hoặc đổi sang máy khác.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Video } from '../types/models';

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  /** video trợ lý gợi ý kèm câu trả lời, để mở lại vẫn thấy thẻ video */
  videos?: Video[];
}

// Phòng hờ: dù server đã cắt theo token, trên máy cũng không giữ quá chừng này tin
const MAX_STORED = 200;

const keyOf = (userId: number) => `vsa_chat_${userId}`;

export async function loadChatHistory(userId: number): Promise<StoredChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(userId));
    const list = raw ? (JSON.parse(raw) as StoredChatMessage[]) : [];
    return Array.isArray(list) ? list.filter((m) => m && (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string') : [];
  } catch {
    return [];     // dữ liệu hỏng / không đọc được → coi như chưa có lịch sử
  }
}

export async function saveChatHistory(userId: number, messages: StoredChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(keyOf(userId), JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    // hết chỗ / trình duyệt chặn lưu → lần sau chỉ không có lịch sử, không làm hỏng màn hình
  }
}

export async function clearChatHistory(userId: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyOf(userId));
  } catch {
    // bỏ qua
  }
}
