/**
 * Địa chỉ backend, đọc từ file .env.local:  EXPO_PUBLIC_API_URL=http://<IP-máy-chạy-backend>:8080
 * Đổi .env.local xong phải tắt `npx expo start` rồi chạy lại mới ăn.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

/** Số phần tử mỗi trang khi gọi API có phân trang. */
export const PAGE_SIZE = 10;
