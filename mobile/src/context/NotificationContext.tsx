/**
 * Thông báo hiện ngay (UC20) — đặt một lần ở gốc app (RootNavigator), giống LoginPromptContext.
 *
 * - Đăng nhập xong: đếm số chưa đọc (GET /api/notifications/unread-count) và mở WebSocket STOMP,
 *   nghe kênh riêng "/user/queue/notifications". Backend tạo thông báo là đẩy xuống ngay.
 * - Có thông báo mới: tăng số trên chuông + hiện banner trượt từ trên xuống 4 giây, bấm vào thì mở video / hồ sơ.
 * - Màn Thông báo gọi markAllRead() → số trên chuông về 0. Đăng xuất thì đóng kết nối.
 *
 * Dùng trong màn hình:  const { unread } = useNotifications();
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import { AppText, Avatar } from '../components';
import { notificationApi } from '../api/notifications';
import { getAuthToken } from '../api/client';
import { API_URL } from '../constants/config';
import { colors, radius, spacing } from '../constants/theme';
import type { AppNotification, NotificationType } from '../types/models';

/** Câu hiện sau tên người gây ra thông báo (dùng chung với màn Thông báo) */
export const NOTIFICATION_ACTION: Record<NotificationType, string> = {
  LIKE: 'đã thích video của bạn',
  COMMENT: 'đã bình luận video của bạn',
  FOLLOW: 'đã bắt đầu theo dõi bạn',
  SHARE: 'đã chia sẻ một video với bạn',
};

interface NotificationContextValue {
  /** Số thông báo chưa đọc (chấm đỏ trên chuông) */
  unread: number;
  /** Mở màn Thông báo → đã đọc hết */
  markAllRead: () => void;
  /** Đếm lại từ server (kéo làm mới Trang chủ) */
  refreshUnread: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const BANNER_MS = 4000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);
  const [banner, setBanner] = useState<AppNotification | null>(null);
  const [slide] = useState(() => new Animated.Value(-160));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshUnread = useCallback(() => {
    if (!user) return;
    notificationApi.unreadCount().then(setUnread).catch(() => {});
  }, [user]);

  const hideBanner = useCallback(() => {
    Animated.timing(slide, { toValue: -160, duration: 200, useNativeDriver: true }).start(() => setBanner(null));
  }, [slide]);

  const showBanner = useCallback((n: AppNotification) => {
    setBanner(n);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    hideTimer.current = setTimeout(hideBanner, BANNER_MS);
  }, [slide, hideBanner]);

  // Đăng nhập → đếm số chưa đọc + mở kết nối nghe thông báo mới. Đăng xuất / đổi tài khoản → đóng.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Đăng xuất thì xoá số trên chuông.
      setUnread(0);
      return;
    }
    refreshUnread();
    const token = getAuthToken();
    if (!token) return;
    const client = new Client({
      brokerURL: API_URL.replace(/^http/, 'ws') + '/ws',
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      // 2 dòng này bắt buộc khi chạy STOMP trên React Native
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      onConnect: () => {
        client.subscribe('/user/queue/notifications', (frame) => {
          try {
            const n = JSON.parse(frame.body) as AppNotification;
            setUnread((c) => c + 1);
            showBanner(n);
          } catch {
            // bỏ qua tin hỏng
          }
        });
      },
    });
    client.activate();
    return () => {
      client.deactivate();
    };
  }, [user, refreshUnread, showBanner]);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const markAllRead = useCallback(() => setUnread(0), []);

  const openBanner = () => {
    if (!banner) return;
    hideBanner();
    if (banner.videoId) navigation.navigate('Watch', { videoId: banner.videoId });
    else navigation.navigate('Profile', { userId: banner.actor.id });
  };

  const name = banner ? banner.actor.displayName || banner.actor.username : '';

  return (
    <NotificationContext.Provider value={{ unread, markAllRead, refreshUnread }}>
      {children}
      {banner && (
        <Animated.View style={[styles.wrap, { top: insets.top + spacing.xs, transform: [{ translateY: slide }] }]}>
          <Pressable onPress={openBanner} style={styles.banner} accessibilityRole="button" accessibilityLabel={`${name} ${NOTIFICATION_ACTION[banner.type]}`}>
            <Avatar uri={banner.actor.avatarUrl} name={name} size={40} />
            <View style={styles.flex}>
              <AppText size={14} numberOfLines={2}>
                <AppText weight="semibold" size={14}>{name}</AppText> {NOTIFICATION_ACTION[banner.type]}
              </AppText>
              {!!banner.text && <AppText size={13} color={colors.muted} numberOfLines={1}>“{banner.text}”</AppText>}
            </View>
          </Pressable>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications phải dùng bên trong NotificationProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 100 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  flex: { flex: 1 },
});
