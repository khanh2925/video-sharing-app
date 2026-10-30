/**
 * Các mảnh giao diện dùng chung cho 2 màn live (LiveHost, LiveWatch) — UC13, UC14
 * Phụ trách: Thanh
 *
 * - LiveVideo: phát lặp video nguồn của buổi live (R12, live giả lập).
 * - useFloatingHearts + FloatingHearts: tim bay lên khi có người thả tim (giống bài animation Chương 11).
 * - ChatBubble: một dòng bình luận trên nền video.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from '../../components';
import { colors } from '../../constants/theme';
import { mediaUrl } from '../../utils/media';
import type { LiveMessage } from '../../types/models';
import { useAppActive } from '../../hooks/useAppActive';

/* ---------- Video phát lặp ---------- */

export function LiveVideo({ uri, paused = false }: { uri: string; paused?: boolean }) {
  // Màn bị che (mở hồ sơ người phát, ra nền...) thì dừng video, quay lại thì phát tiếp
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const shouldPlay = isFocused && appActive && !paused;

  // loop = true → hết video thì tự phát lại từ đầu, nhìn như đang live liên tục
  const player = useVideoPlayer(mediaUrl(uri) ?? null, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (shouldPlay) player.play();
    else player.pause();
  }, [shouldPlay, player]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

/* ---------- Tim bay ---------- */

const HEART_DURATION = 1800;

/** Giữ danh sách tim đang bay. Gọi addHeart() mỗi lần có người thả tim. */
export function useFloatingHearts() {
  const [hearts, setHearts] = useState<{ id: number; offsetX: number }[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const addHeart = useCallback(() => {
    const id = nextId.current++;
    const offsetX = Math.round(Math.random() * 30 - 15);
    setHearts((list) => [...list.slice(-15), { id, offsetX }]);
    // Bay xong thì xoá khỏi danh sách
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setHearts((list) => list.filter((h) => h.id !== id));
    }, HEART_DURATION);
    timers.current.add(timer);
  }, []);

  // Rời màn thì huỷ hết hẹn giờ
  useEffect(() => {
    const pending = timers.current;
    return () => { pending.forEach(clearTimeout); pending.clear(); };
  }, []);

  return { hearts, addHeart };
}

function Heart({ offsetX }: { offsetX: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: HEART_DURATION });
  }, [progress]);

  // translateY: bay từ dưới lên 260px; opacity: mờ dần
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateY: -260 * progress.value },
      { translateX: offsetX * progress.value },
      { scale: 0.8 + progress.value * 0.5 },
    ],
  }));

  return (
    <Animated.View style={[styles.heart, animatedStyle]}>
      <Ionicons name="heart" size={30} color={colors.primary} />
    </Animated.View>
  );
}

/** Đặt khung này ở góc phải, phía trên nút thả tim */
export function FloatingHearts({ hearts, bottom, right = 24 }: { hearts: { id: number; offsetX: number }[]; bottom: number; right?: number }) {
  return (
    <View pointerEvents="none" style={[styles.heartArea, { bottom, right }]}>
      {hearts.map((h) => (
        <Heart key={h.id} offsetX={h.offsetX} />
      ))}
    </View>
  );
}

/* ---------- Thông báo ngắn ---------- */

/** Thông báo ngắn tự ẩn sau 3 giây (chưa kết nối xong, tin nhắn bị từ chối...) */
export function useLiveNotice() {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 3000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { notice, showNotice };
}

export function LiveNotice({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <AppText size={12} color={colors.white}>{text}</AppText>
    </View>
  );
}

/** Câu báo khi gửi lúc socket chưa kết nối xong */
export const NOT_CONNECTED_TEXT = 'Đang kết nối tới phòng live, thử lại sau giây lát';

/* ---------- Dòng bình luận ---------- */

export function ChatBubble({ message, isHost }: { message: LiveMessage; isHost: boolean }) {
  // Thả tim hiện thành "thả tim", bình luận hiện nội dung
  const text = message.type === 'REACTION' ? 'thả tim' : message.content;
  return (
    <View style={[styles.bubble, isHost && styles.bubbleHost]}>
      <AppText size={13} color={colors.white} style={styles.bubbleText}>
        <AppText weight="bold" size={13} color={isHost ? colors.white : LIVE_NAME_COLOR}>
          {message.sender.username}
        </AppText>{' '}
        {text}
      </AppText>
    </View>
  );
}

/** Màu chữ tên người bình luận trên nền tối (hồng nhạt) và nền bong bóng của chủ live */
export const LIVE_NAME_COLOR = colors.liveName;
/** colors.primary (#DB2766) mờ 85% */
export const LIVE_HOST_BUBBLE = 'rgba(219,39,102,0.85)';

/**
 * Các màu mờ dùng trên nền video của 2 màn live. theme.ts chưa có token cho màu trong suốt
 * nên gom về đây, đừng gõ thẳng rgba trong màn hình.
 */
export const liveColors = {
  bubble: 'rgba(0,0,0,0.3)',          // nền bong bóng chat
  pill: 'rgba(0,0,0,0.4)',            // nền nút tròn, viên thuốc trên video
  input: 'rgba(0,0,0,0.35)',          // nền ô nhập chat, nhãn tiêu đề
  inputBorder: 'rgba(255,255,255,0.35)',
  placeholder: 'rgba(255,255,255,0.75)',
  followed: 'rgba(255,255,255,0.25)', // nút "Đã theo dõi"
  topShade: 'rgba(0,0,0,0.55)',
  bottomShade: 'rgba(0,0,0,0.75)',
  dim: 'rgba(0,0,0,0.4)',             // phủ mờ lúc đang xử lý
  summary: 'rgba(23,20,28,0.92)',     // colors.text (#17141C) mờ 92%, bảng tổng kết / live đã kết thúc
} as const;
export const LIVE_BUBBLE = liveColors.bubble;

const styles = StyleSheet.create({
  heartArea: { position: 'absolute', width: 40, height: 40, alignItems: 'center' },
  heart: { position: 'absolute', bottom: 0 },
  bubble: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: LIVE_BUBBLE, marginTop: 8, maxWidth: '100%' },
  bubbleHost: { backgroundColor: LIVE_HOST_BUBBLE },
  bubbleText: { lineHeight: 18 },
  notice: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: liveColors.pill },
});
