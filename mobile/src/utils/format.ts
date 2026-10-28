/** Định dạng số, thời gian để hiển thị — giống cách ghi trong prototype. */

/** 950 → "950", 8912 → "8.912", 12400 → "12,4N", 1200000 → "1,2Tr" */
export function formatCount(n: number): string {
  if (n < 10_000) return n.toLocaleString('vi-VN');
  if (n < 1_000_000) return `${trimDecimal(n / 1_000)}N`;
  return `${trimDecimal(n / 1_000_000)}Tr`;
}

function trimDecimal(value: number): string {
  // 12.43 → "12,4"; 48.0 → "48"
  return (Math.floor(value * 10) / 10).toString().replace('.', ',');
}

/** 28 → "0:28", 75 → "1:15" */
export function formatDuration(totalSec: number): string {
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/** "2026-10-25T10:00:00" → "Vừa xong" / "5 phút trước" / "3 giờ trước" / "2 ngày trước" / "25/10/2026" */
export function timeAgo(iso: string): string {
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

/** Nhãn tiếng Việt cho chế độ hiển thị video */
export const visibilityLabel = {
  PUBLIC: 'Mọi người',
  FOLLOWERS: 'Người theo dõi',
  PRIVATE: 'Chỉ mình tôi',
} as const;
