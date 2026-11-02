/**
 * Hộp hỏi xác nhận chạy được cả trên điện thoại lẫn bản web.
 * Alert.alert của React Native trên web không hiện gì cả (bấm Đăng xuất trên web không có phản hồi),
 * nên trên web dùng window.confirm của trình duyệt.
 *
 *   if (await confirmAsync('Đăng xuất?', undefined, 'Đăng xuất')) await logout();
 */
import { Alert, Platform } from 'react-native';

export function confirmAsync(title: string, message?: string, okText = 'Đồng ý', destructive = true): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Huỷ', style: 'cancel', onPress: () => resolve(false) },
      { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
