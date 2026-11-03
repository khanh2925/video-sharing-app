/**
 * Buổi live đang phát của chính mình (UC13) — đặt một lần ở gốc app (RootNavigator), giống NotificationContext.
 *
 * Vì sao kết nối nằm ở đây mà không nằm trong màn LiveHost:
 *   backend tự kết thúc live khi kết nối WebSocket của người phát đóng (LiveDisconnectListener).
 *   Muốn "thu nhỏ" live để đi làm việc khác thì kết nối phải sống lâu hơn màn hình.
 *
 * - LiveHost gọi attach(live) khi mở → mở kết nối (nếu chưa có) và nghe sự kiện qua listen().
 * - Bấm "Thu nhỏ" → rời màn LiveHost, kết nối vẫn mở, live vẫn chạy. Góc phải hiện nút nổi
 *   "LIVE 05:12", bấm vào thì mở lại LiveHost.
 * - Kết thúc live / nhận sự kiện ENDED / đăng xuất → đóng kết nối, ẩn nút nổi.
 *
 * Dùng trong màn hình:  const hostLive = useHostLive();
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { NavigationContainerRefContext } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './AuthContext';
import { AppText } from '../components';
import { connectLive } from '../api/lives';
import { getAuthToken } from '../api/client';
import { colors, spacing } from '../constants/theme';
import { formatDuration } from '../utils/format';
import type { LiveSocketEvent, LiveStream } from '../types/models';

type Connection = ReturnType<typeof connectLive>;

export interface HostLiveListener {
  onEvent: (e: LiveSocketEvent) => void;
  onError?: (message: string) => void;
}

interface HostLiveContextValue {
  /** Buổi live đang phát (null = không live) */
  active: LiveStream | null;
  /** Số người xem cao nhất từ lúc bắt đầu (kể cả lúc đang thu nhỏ), để hiện ở bảng tổng kết */
  peakViewers: number;
  /** Mở kết nối cho buổi live này (gọi lại nhiều lần không sao) */
  attach: (live: LiveStream) => void;
  /** Nghe sự kiện của phòng, trả về hàm huỷ nghe */
  listen: (listener: HostLiveListener) => () => void;
  /** Gửi chat, false nếu chưa kết nối xong */
  chat: (text: string) => boolean;
  /** Live đã kết thúc → đóng kết nối, ẩn nút nổi */
  detach: () => void;
}

const HostLiveContext = createContext<HostLiveContextValue | null>(null);

export function HostLiveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const rootNav = useContext(NavigationContainerRefContext);
  const [active, setActive] = useState<LiveStream | null>(null);
  const [peakViewers, setPeakViewers] = useState(0);
  const connRef = useRef<Connection | null>(null);
  const listenersRef = useRef(new Set<HostLiveListener>());

  const detach = useCallback(() => {
    connRef.current?.close();
    connRef.current = null;
    setActive(null);
  }, []);

  const attach = useCallback((live: LiveStream) => {
    if (live.status !== 'LIVE') return;
    setActive(live);
    if (connRef.current) return; // đã mở từ lần vào màn trước
    setPeakViewers(live.viewerCount);
    // Sự kiện đi qua đây rồi chia cho màn LiveHost (nếu đang mở)
    const onEvent = (e: LiveSocketEvent) => {
      if (e.event === 'VIEWERS' && e.viewerCount !== null) setPeakViewers((p) => Math.max(p, e.viewerCount!));
      listenersRef.current.forEach((l) => l.onEvent(e));
      if (e.event === 'ENDED') {
        connRef.current?.close();
        connRef.current = null;
        setActive(null);
      }
    };
    const onError = (message: string) => listenersRef.current.forEach((l) => l.onError?.(message));
    // join: false → người phát không bị tính là 1 người xem
    connRef.current = connectLive(live.id, getAuthToken(), onEvent, { join: false, onError });
  }, []);

  const listen = useCallback((listener: HostLiveListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const chat = useCallback((text: string) => connRef.current?.chat(text) ?? false, []);

  // Đăng xuất (hoặc token hết hạn) thì đóng kết nối
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Dọn trạng thái khi mất đăng nhập.
    if (!user) detach();
  }, [user, detach]);

  // Đóng app (unmount) thì đóng kết nối
  useEffect(() => () => connRef.current?.close(), []);

  // Theo dõi màn đang mở để ẩn nút nổi khi đang ở chính màn LiveHost
  const [routeName, setRouteName] = useState<string | undefined>();
  useEffect(() => {
    if (!rootNav) return;
    const update = () => setRouteName(rootNav.getCurrentRoute()?.name);
    update();
    return rootNav.addListener('state', update);
  }, [rootNav]);

  const value = useMemo(
    () => ({ active, peakViewers, attach, listen, chat, detach }),
    [active, peakViewers, attach, listen, chat, detach],
  );

  return (
    <HostLiveContext.Provider value={value}>
      {children}
      {active && routeName !== 'LiveHost' && (
        <MiniLiveButton
          live={active}
          onPress={() => rootNav?.navigate('LiveHost', { liveId: active.id })}
        />
      )}
    </HostLiveContext.Provider>
  );
}

export function useHostLive() {
  const ctx = useContext(HostLiveContext);
  if (!ctx) throw new Error('useHostLive phải dùng bên trong HostLiveProvider');
  return ctx;
}

/** Nút nổi góc phải khi live đang thu nhỏ: chấm đỏ + "LIVE" + thời gian đã phát */
function MiniLiveButton({ live, onPress }: { live: LiveStream; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = new Date(live.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [live.startedAt]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 64 }]}>
      <Pressable
        onPress={onPress}
        style={styles.pill}
        accessibilityRole="button"
        accessibilityLabel={`Đang phát live ${formatDuration(elapsed)}, bấm để quay lại`}
      >
        <View style={styles.dot} />
        <AppText weight="bold" size={12} color={colors.white}>{`LIVE ${formatDuration(elapsed)}`}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: spacing.md },
  pill: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.live,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
});
