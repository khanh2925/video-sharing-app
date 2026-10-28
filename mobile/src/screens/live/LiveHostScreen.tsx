/**
 * Đang phát live (người phát) — UC13
 * Phụ trách: Thanh
 *
 * - Phát lặp video nguồn (R12), nhãn LIVE + thời gian đã phát + số người xem.
 * - Chat và tim nhận qua WebSocket STOMP (connectLive), người phát cũng chat được.
 * - "Kết thúc" hoặc bấm quay lại đều hỏi xác nhận → gọi API kết thúc → hiện bảng tổng kết.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePreventRemove } from '@react-navigation/native';
import { AppText, Button, ErrorView, Loading, Screen } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { liveApi, connectLive } from '../../api/lives';
import { getAuthToken, getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { formatCount, formatDuration } from '../../utils/format';
import type { LiveMessage, LiveSocketEvent } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';
import { ChatBubble, FloatingHearts, LiveVideo, useFloatingHearts } from './LiveParts';

type Connection = ReturnType<typeof connectLive>;

export default function LiveHostScreen({ navigation, route }: RootScreenProps<'LiveHost'>) {
  const { liveId } = route.params;
  const { data: live, loading, error, reload } = useFetch(() => liveApi.getById(liveId), [liveId]);

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [heartCount, setHeartCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [draft, setDraft] = useState('');
  const [ended, setEnded] = useState(false);
  const [ending, setEnding] = useState(false);
  const { hearts, addHeart } = useFloatingHearts();
  const connRef = useRef<Connection | null>(null);

  const commentCount = messages.filter((m) => m.type === 'COMMENT').length;

  // Số người xem ban đầu lấy từ API, sau đó cập nhật qua socket
  useEffect(() => {
    if (live) {
      setViewers(live.viewerCount);
      setPeakViewers(live.viewerCount);
    }
  }, [live]);

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
    liveApi
      .messages(liveId)
      .then((list) => {
        setMessages(list);
        setHeartCount(list.filter((m) => m.type === 'REACTION').length);
      })
      .catch(() => {});

    const onEvent = (e: LiveSocketEvent) => {
      switch (e.event) {
        case 'COMMENT':
          if (e.message) setMessages((list) => [...list, e.message!]);
          break;
        case 'REACTION':
          setHeartCount((n) => n + 1);
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

    const conn = connectLive(liveId, getAuthToken(), onEvent);
    connRef.current = conn;
    return () => {
      conn.close();
      connRef.current = null;
    };
  }, [liveId, addHeart]);

  const endLive = async () => {
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

  // Chặn nút quay lại / vuốt lùi của Android khi đang live: hỏi xác nhận trước
  usePreventRemove(!!live && !ended, () => confirmEnd());

  const sendChat = () => {
    const text = draft.trim();
    if (!text) return;
    connRef.current?.chat(text); // tin nhắn sẽ quay về qua sự kiện COMMENT
    setDraft('');
  };

  const goProfile = () => navigation.navigate('MainTabs', { screen: 'MyProfile' });

  if (loading) return <Loading dark />;
  if (error || !live) {
    return (
      <Screen>
        <ErrorView message={error ?? 'Không tìm thấy buổi live'} onRetry={reload} />
      </Screen>
    );
  }

  // Tin mới nhất ở cuối mảng → đảo ngược cho FlatList inverted
  const chatData = [...messages].reverse().slice(0, 50);

  return (
    <Screen dark edges={[]}>
      <LiveVideo uri={live.sourceVideoUrl} paused={ended} />
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={styles.topShade} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.bottomShade} pointerEvents="none" />

      {/* Thanh trên: LIVE + thời gian, số người xem, nút Kết thúc */}
      <View style={styles.topBar}>
        <View style={styles.liveBadge}>
          <View style={styles.dot} />
          <AppText weight="bold" size={12} color={colors.white}>{`LIVE ${formatDuration(elapsed)}`}</AppText>
        </View>
        <View style={styles.viewerBadge} accessibilityLabel={`${viewers} người đang xem`}>
          <Ionicons name="eye-outline" size={14} color={colors.white} />
          <AppText weight="semibold" size={12} color={colors.white}>{formatCount(viewers)}</AppText>
        </View>
        <Pressable onPress={confirmEnd} style={styles.endBtn} accessibilityRole="button">
          <AppText weight="bold" size={14} color={colors.danger}>Kết thúc</AppText>
        </Pressable>
      </View>
      <View style={styles.titleTag}>
        <AppText size={12} color={colors.white} numberOfLines={1}>{live.title}</AppText>
      </View>

      <FloatingHearts hearts={hearts} bottom={130} />

      <KeyboardAvoidingView style={styles.bottomArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            placeholderTextColor="rgba(255,255,255,0.75)"
            maxLength={500}
            onSubmitEditing={sendChat}
            returnKeyType="send"
            style={styles.input}
            accessibilityLabel="Bình luận"
          />
          <Pressable
            onPress={sendChat}
            disabled={!draft.trim()}
            style={[styles.sendBtn, !draft.trim() && styles.disabled]}
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
            <Stat value={formatCount(peakViewers)} label="Lượt xem" />
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
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 360 },
  topBar: { position: 'absolute', top: 48, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  liveBadge: { height: 28, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.live, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white },
  viewerBadge: { height: 28, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colors.overlay, flexDirection: 'row', alignItems: 'center', gap: 4 },
  endBtn: { marginLeft: 'auto', height: 40, paddingHorizontal: spacing.lg, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center' },
  titleTag: { position: 'absolute', top: 96, left: spacing.lg, maxWidth: '80%', height: 28, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center' },
  bottomArea: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 34, gap: 10 },
  chat: { maxHeight: 220, flexGrow: 0 },
  statsPill: { alignSelf: 'flex-start', height: 32, borderRadius: 16, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 18, color: colors.white, fontFamily: fonts.regular, fontSize: 14 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  endingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  summary: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(23,20,28,0.92)', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { width: 90 },
  statLabel: { opacity: 0.8, marginTop: 2 },
  summaryBtn: { height: 50, paddingHorizontal: 28 },
});
