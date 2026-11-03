/**
 * Đang phát live (người phát) — UC13
 * Phụ trách: Thanh
 *
 * - Phát lặp video nguồn (R12), nhãn LIVE + thời gian đã phát + số người xem.
 * - Chat và tim nhận qua WebSocket STOMP (connectLive), người phát cũng chat được.
 * - "Kết thúc" hoặc bấm quay lại đều hỏi xác nhận → gọi API kết thúc → hiện bảng tổng kết.
 * - Nút thu nhỏ (mũi tên xuống): rời màn mà live vẫn chạy, đi làm việc khác; góc phải hiện nút nổi
 *   "LIVE 05:12" để quay lại. Kết nối WebSocket giữ ở HostLiveContext, vì đóng kết nối là backend kết thúc live.
 * - Đã kết thúc mà bấm quay lại (Android) thì về Hồ sơ, không quay về màn Quay video.
 */
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, ErrorView, Loading, Screen } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { liveApi, LIVE_MESSAGE_MAX } from '../../api/lives';
import { getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useHostLive } from '../../context/HostLiveContext';
import { formatCount, formatDuration } from '../../utils/format';
import { mergeLiveMessages } from '../../utils/live';
import type { LiveMessage, LiveSocketEvent } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';
import { ChatBubble, FloatingHearts, LiveNotice, LiveVideo, liveColors, NOT_CONNECTED_TEXT, useFloatingHearts, useLiveNotice } from './LiveParts';

export default function LiveHostScreen({ navigation, route }: RootScreenProps<'LiveHost'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const hostLive = useHostLive();
  const { liveId } = route.params;
  const { data: live, loading, error, reload } = useFetch(() => liveApi.getById(liveId), [liveId]);

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [reactions, setReactions] = useState<LiveMessage[]>([]);
  const heartCount = reactions.length;
  const [elapsed, setElapsed] = useState(0);
  const [draft, setDraft] = useState('');
  const [ended, setEnded] = useState(false);
  const [ending, setEnding] = useState(false);
  // Rời màn: 'profile' = về hồ sơ sau khi kết thúc, 'minimize' = thu nhỏ, live vẫn chạy
  const [exitTo, setExitTo] = useState<'profile' | 'minimize' | null>(null);
  const { hearts, addHeart } = useFloatingHearts();
  const { notice, showNotice } = useLiveNotice();

  const commentCount = messages.filter((m) => m.type === 'COMMENT').length;

  // Số người xem ban đầu lấy từ API, sau đó cập nhật qua socket
  useEffect(() => {
    if (live) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Khởi tạo trạng thái từ REST trước khi nhận socket.
      setViewers(live.viewerCount);
      setPeakViewers(live.viewerCount);
      if (live.status === 'ENDED') setEnded(true);
    }
  }, [live]);

  // Live đang chạy → mở (hoặc dùng lại) kết nối giữ ở HostLiveContext
  const { attach, listen, detach } = hostLive;
  useEffect(() => {
    if (live?.status === 'LIVE') attach(live);
  }, [live, attach]);

  // Đồng hồ: số giây từ lúc bắt đầu live, mỗi giây tính lại 1 lần
  useEffect(() => {
    if (!live || ended) return;
    const started = new Date(live.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [live, ended]);

  // Tải tin nhắn cũ + mở WebSocket. Rời màn thì đóng kết nối.
  useEffect(() => {
    let alive = true;
    liveApi
      .messages(liveId)
      .then((list) => {
        if (!alive) return;
        setMessages((current) => mergeLiveMessages(current, list.filter((m) => m.type === 'COMMENT')));
        setReactions((current) => mergeLiveMessages(current, list.filter((m) => m.type === 'REACTION')));
      })
      .catch(() => {});

    const onEvent = (e: LiveSocketEvent) => {
      switch (e.event) {
        case 'COMMENT':
          if (e.message) setMessages((list) => mergeLiveMessages(list, [e.message!]));
          break;
        case 'REACTION':
          if (e.message) setReactions((list) => mergeLiveMessages(list, [e.message!]));
          addHeart();
          break;
        case 'VIEWERS':
          if (e.viewerCount !== null) {
            setViewers(e.viewerCount);
            setPeakViewers((p) => Math.max(p, e.viewerCount!));
          }
          break;
        case 'ENDED':
          setEnded(true);
          break;
      }
    };

    // Chỉ huỷ nghe khi rời màn, KHÔNG đóng kết nối (đóng là backend kết thúc live)
    const unlisten = listen({ onEvent, onError: showNotice });
    return () => {
      alive = false;
      unlisten();
    };
  }, [liveId, addHeart, showNotice, listen]);

  // Đã kết thúc → đóng kết nối, ẩn nút nổi
  useEffect(() => {
    if (ended) detach();
  }, [ended, detach]);

  const endLive = async () => {
    if (ending || ended) return;
    setEnding(true);
    try {
      await liveApi.end(liveId);
      setEnded(true);
    } catch (e) {
      Alert.alert('Không kết thúc được live', getErrorMessage(e));
    } finally {
      setEnding(false);
    }
  };

  const confirmEnd = () => {
    Alert.alert('Kết thúc live?', `${formatCount(viewers)} người đang xem sẽ bị ngắt.`, [
      { text: 'Tiếp tục live', style: 'cancel' },
      { text: 'Kết thúc', style: 'destructive', onPress: endLive },
    ]);
  };

  // Rời màn: bật cờ exitTo để usePreventRemove thôi chặn, rồi mới popTo (xem effect dưới)
  const goProfile = () => setExitTo('profile');
  const minimize = () => setExitTo('minimize');
  useEffect(() => {
    if (exitTo === 'profile') navigation.popTo('MainTabs', { screen: 'MyProfile' });
    if (exitTo === 'minimize') navigation.popTo('MainTabs');
  }, [exitTo, navigation]);

  // Chặn nút quay lại của Android: đang live thì hỏi xác nhận, đã kết thúc thì về hồ sơ
  usePreventRemove(!!user && !!live && !exitTo, () => (ended ? goProfile() : confirmEnd()));

  const sendChat = () => {
    const text = draft.trim();
    if (!text) return;
    // Chưa kết nối xong → giữ nguyên chữ đã gõ để gửi lại
    if (!hostLive.chat(text)) {
      showNotice(NOT_CONNECTED_TEXT);
      return;
    }
    setDraft(''); // tin nhắn sẽ quay về qua sự kiện COMMENT
  };

  if (loading) return <Loading dark />;
  if (error || !live) {
    return (
      <Screen>
        {/* Màn này tắt vuốt lùi nên phải có nút đóng */}
        <Pressable onPress={() => navigation.goBack()} style={styles.errorClose} accessibilityRole="button" accessibilityLabel="Đóng">
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <ErrorView message={error ?? 'Không tìm thấy buổi live'} onRetry={reload} />
      </Screen>
    );
  }

  // Tin mới nhất ở cuối mảng → đảo ngược cho FlatList inverted
  const chatData = [...messages].reverse().slice(0, 50);

  return (
    <Screen dark edges={[]}>
      <LiveVideo uri={live.sourceVideoUrl} paused={ended} />
      <LinearGradient colors={[liveColors.topShade, 'transparent']} style={styles.topShade} pointerEvents="none" />
      <LinearGradient colors={['transparent', liveColors.bottomShade]} style={styles.bottomShade} pointerEvents="none" />

      {/* Thanh trên: LIVE + thời gian, số người xem, nút Kết thúc */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <View style={styles.liveBadge}>
          <View style={styles.dot} />
          <AppText weight="bold" size={12} color={colors.white}>{`LIVE ${formatDuration(elapsed)}`}</AppText>
        </View>
        <View style={styles.viewerBadge} accessibilityLabel={`${viewers} người đang xem`}>
          <Ionicons name="eye-outline" size={14} color={colors.white} />
          <AppText weight="semibold" size={12} color={colors.white}>{formatCount(viewers)}</AppText>
        </View>
        <View style={styles.spacer} />
        {!ended && (
          <Pressable onPress={minimize} style={styles.minBtn} accessibilityRole="button" accessibilityLabel="Thu nhỏ, live vẫn tiếp tục">
            <Ionicons name="chevron-down" size={22} color={colors.white} />
          </Pressable>
        )}
        <Pressable onPress={confirmEnd} style={styles.endBtn} accessibilityRole="button">
          <AppText weight="bold" size={14} color={colors.danger}>Kết thúc</AppText>
        </Pressable>
      </View>
      <View style={[styles.titleTag, { top: insets.top + 60 }]}>
        <AppText size={12} color={colors.white} numberOfLines={1}>{live.title}</AppText>
      </View>

      <FloatingHearts hearts={hearts} bottom={130} />

      <KeyboardAvoidingView style={[styles.bottomArea, { bottom: Math.max(insets.bottom, 16) }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Bình luận trực tiếp */}
        <FlatList
          data={chatData}
          inverted
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <ChatBubble message={item} isHost={item.sender.id === live.host.id} />}
          style={styles.chat}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="Bình luận trực tiếp"
        />

        <LiveNotice text={notice} />

        <View style={styles.statsPill}>
          <Ionicons name="heart" size={16} color={colors.primary} />
          <AppText size={13} color={colors.white}>{`${formatCount(heartCount)} tim · ${formatCount(commentCount)} bình luận`}</AppText>
        </View>

        {/* Người phát chat với người xem */}
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Trò chuyện với người xem…"
            placeholderTextColor={liveColors.placeholder}
            maxLength={LIVE_MESSAGE_MAX}
            onSubmitEditing={sendChat}
            returnKeyType="send"
            editable={!ended}
            style={styles.input}
            accessibilityLabel="Bình luận"
          />
          <Pressable
            onPress={sendChat}
            disabled={!draft.trim() || ended}
            style={[styles.sendBtn, (!draft.trim() || ended) && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Gửi"
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {ending && (
        <View style={styles.endingOverlay}>
          <Loading dark />
        </View>
      )}

      {/* Bảng tổng kết sau khi kết thúc */}
      {ended && (
        <View style={styles.summary}>
          <AppText weight="bold" size={22} color={colors.white}>Buổi live đã kết thúc</AppText>
          <View style={styles.statsRow}>
            <Stat value={formatDuration(elapsed)} label="Thời lượng" />
            <Stat value={formatCount(Math.max(peakViewers, hostLive.peakViewers))} label="Lượt xem" />
            <Stat value={formatCount(heartCount)} label="Tim" />
          </View>
          <Button title="Về hồ sơ" onPress={goProfile} style={styles.summaryBtn} />
        </View>
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText weight="bold" size={18} color={colors.white} align="center">{value}</AppText>
      <AppText size={12} color={colors.white} align="center" style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  errorClose: { width: 48, height: 48, marginLeft: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 360 },
  topBar: { position: 'absolute', top: 48, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  liveBadge: { height: 28, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.live, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white },
  viewerBadge: { height: 28, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.overlay, flexDirection: 'row', alignItems: 'center', gap: 4 },
  spacer: { flex: 1 },
  minBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  endBtn: { height: 40, paddingHorizontal: spacing.lg, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center' },
  titleTag: { position: 'absolute', top: 96, left: spacing.lg, maxWidth: '80%', height: 28, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: liveColors.input, justifyContent: 'center' },
  bottomArea: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 34, gap: 10 },
  chat: { maxHeight: 220, flexGrow: 0 },
  statsPill: { alignSelf: 'flex-start', height: 32, borderRadius: 16, paddingHorizontal: 12, backgroundColor: liveColors.pill, flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: liveColors.inputBorder, backgroundColor: liveColors.input, paddingHorizontal: 18, color: colors.white, fontFamily: fonts.regular, fontSize: 14 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  endingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: liveColors.dim },
  summary: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: liveColors.summary, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { width: 90 },
  statLabel: { opacity: 0.8, marginTop: 2 },
  summaryBtn: { height: 50, paddingHorizontal: 28 },
});
