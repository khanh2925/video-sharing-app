/**
 * Trên bản web, Alert.alert của React Native không hiện gì cả: mọi thông báo lỗi và hộp hỏi
 * xác nhận đều "câm" (bấm Xoá, Đăng xuất, Bỏ video... không có phản hồi).
 * File này thay Alert.alert trên web bằng hộp thoại của trình duyệt, để mọi màn dùng Alert
 * chạy được trên web mà không phải sửa từng chỗ. Trên điện thoại không làm gì.
 *
 * Cách hiểu nút:
 *   - 0 hoặc 1 nút  → window.alert, rồi chạy nút đó (nếu có).
 *   - 2 nút          → window.confirm: OK = nút không phải "cancel", Huỷ = nút cancel.
 *   - 3 nút trở lên  → hỏi lần lượt từng nút không phải cancel ("Chọn <tên nút>?"),
 *                       nút đầu tiên được OK thì chạy; không chọn nút nào thì chạy nút cancel.
 * Gọi installWebAlert() một lần ở App.tsx.
 */
import { Alert, Platform, type AlertButton } from 'react-native';

export function installWebAlert() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = message ? `${title}\n\n${message}` : title;
    const list = buttons ?? [];
    const cancel = list.find((b) => b.style === 'cancel');
    const actions = list.filter((b) => b !== cancel);

    if (list.length <= 1) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }
    if (actions.length === 1) {
      if (window.confirm(`${text}\n\nBấm OK để "${actions[0].text}".`)) actions[0].onPress?.();
      else cancel?.onPress?.();
      return;
    }
    for (const b of actions) {
      if (window.confirm(`${text}\n\nChọn "${b.text}"?`)) {
        b.onPress?.();
        return;
      }
    }
    cancel?.onPress?.();
  };
}
