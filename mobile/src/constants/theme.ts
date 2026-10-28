/**
 * Màu, chữ, khoảng cách dùng chung cho cả app — lấy đúng theo prototype.
 * Màn nào cũng import từ đây, KHÔNG gõ thẳng mã màu như '#DB2766' trong màn hình.
 */
export const colors = {
  primary: '#DB2766',      // nút chính, tab đang chọn
  primaryText: '#C81E5B',  // chữ/link màu hồng
  primarySoft: '#FDECF2',  // nền hồng nhạt
  text: '#17141C',         // chữ chính
  muted: '#6B6573',        // chữ phụ
  placeholder: '#8A8590',  // chữ gợi ý trong ô nhập
  border: '#ECE7EE',       // đường kẻ, viền
  surface: '#F6F3F7',      // nền ô nhập, nút xám
  background: '#FFFFFF',
  blue: '#2563EB',         // vòng story chưa xem
  blueText: '#1D4ED8',     // hashtag
  blueSoft: '#EEF3FE',
  live: '#D92C2C',         // nhãn LIVE
  liveName: '#FFD3E2',     // tên người chat trong live
  flash: '#FFD84D',        // nút flash đang bật
  danger: '#B71C1C',       // lỗi, nút xoá
  success: '#065F46',
  successSoft: '#E8F7F1',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.45)', // nền tối mờ trên video
  whiteSoft: 'rgba(255,255,255,0.16)',  // ô nhập / nút mờ trên nền video
  whiteTrack: 'rgba(255,255,255,0.3)',  // nền thanh tiến độ trên video
  whiteGlass: 'rgba(255,255,255,0.5)',  // viền, chữ mờ trên nền video
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const radius = { sm: 8, md: 12, lg: 14, xl: 22, full: 999 } as const;

/** Mỗi độ đậm là một file font riêng (React Native không tự làm đậm font tải ngoài). */
export const fonts = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
} as const;
export type FontWeight = keyof typeof fonts;

export const fontSize = { xs: 11, sm: 12, md: 13, base: 15, lg: 17, xl: 18, xxl: 22 } as const;
