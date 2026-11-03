/**
 * Axios dùng chung cho mọi API (giống services/api.ts ở Buổi 7).
 * - baseURL đã có sẵn "/api" → gọi api.get('/videos/me/drafts') là đủ.
 * - Interceptor tự gắn "Authorization: Bearer <token>" nếu đã đăng nhập.
 * - getErrorMessage(e) đổi mọi kiểu lỗi thành 1 câu tiếng Việt để hiện lên màn hình.
 */
import axios from 'axios';
import { API_URL } from '../constants/config';
import type { ApiErrorBody } from '../types/models';

let authToken: string | null = null;
let onUnauthorized: ((message?: string) => void) | null = null;

/** AuthContext gọi hàm này mỗi khi đăng nhập / đăng xuất. Màn hình không cần gọi. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Token hiện tại, dùng khi mở WebSocket live (connectLive). null = khách. */
export function getAuthToken() {
  return authToken;
}

/** AuthContext đăng ký: token hết hạn (backend trả 401) thì tự đăng xuất. */
export function setOnUnauthorized(handler: ((message?: string) => void) | null) {
  onUnauthorized = handler;
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Đang có token mà vẫn bị 401 → token hết hạn hoặc tài khoản bị khoá (backend ghi lý do trong message)
    if (axios.isAxiosError<ApiErrorBody>(error) && error.response?.status === 401 && authToken) {
      onUnauthorized?.(error.response.data?.message);
    }
    return Promise.reject(error);
  },
);

/**
 * Gửi form có file (multipart/form-data), dùng cho đăng video, đăng story, đổi avatar.
 * Cách tạo form: xem fileFromUri() trong utils/media.ts.
 */
export function postMultipart<T>(url: string, form: FormData) {
  return api
    // Video lớn qua mạng chậm có thể mất vài phút → cho tối đa 5 phút
    .post<T>(url, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 })
    .then((res) => res.data);
}

/** Lấy câu thông báo lỗi để hiển thị. Backend có trả message thì dùng luôn message đó. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const message = error.response?.data?.message;
    if (message) return message;
    if (error.code === 'ECONNABORTED') return 'Máy chủ phản hồi quá lâu, thử lại sau';
    if (!error.response) return 'Không kết nối được máy chủ. Kiểm tra mạng hoặc EXPO_PUBLIC_API_URL';
    return `Có lỗi xảy ra (mã ${error.response.status})`;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Có lỗi xảy ra, thử lại sau';
}
