/**
 * Xem live — UC14
 * Phụ trách: Thanh
 *
 * - Khách xem được (R3); bình luận, thả tim, theo dõi thì phải đăng nhập (requireAuth).
 * - Video phát lặp (R12), chat + tim + số người xem cập nhật qua WebSocket STOMP.
 * - "Mua ngay", "Chia sẻ" chưa làm (R16) → báo "Tính năng sẽ có ở phiên bản sau".
 * - Nhận sự kiện ENDED → hiện "Live đã kết thúc".
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Avatar, Button, ErrorView, Loading, Screen } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { liveApi, connectLive, LIVE_MESSAGE_MAX } from '../../api/lives';
import { getAuthToken, getErrorMessage } from '../../api/client';
import { userApi } from '../../api/catalog';
import { useFetch } from '../../hooks/useFetch';
import { formatCount } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { LiveMessage, LiveSocketEvent } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';
import { ChatBubble, FloatingHearts, LiveNotice, LiveVideo, liveColors, NOT_CONNECTED_TEXT, useFloatingHearts, useLiveNotice } from './LiveParts';

type Connection = ReturnType<typeof connectLive>;

const comingSoon = () => Alert.alert('Thông báo', 'Tính năng sẽ có ở phiên bản sau');

export default function LiveWatchScreen({ navigation, route }: RootScreenProps<'LiveWatch'>) {
  const { liveId } = route.params;
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const { data: live, loading, error, reload } = useFetch(() => liveApi.getById(liveId), [liveId]);

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [myHearts, setMyHearts] = useState(0);
  const [draft, setDraft] = useState('');
  const [ended, setEnded] = useState(false);
  const [followed, setFollowed] = useState(false);
  const { hearts, addHeart } = useFloatingHearts();
  const { notice, showNotice } = useLiveNotice();
  const connRef = useRef<Connection | null>(null);

  // Đã đăng nhập và không phải live của mình → hỏi hồ sơ người phát xem mình đã theo dõi chưa
  const hostId = live?.host.id;
  useEffect(() => {
    if (!user || !hostId || hostId === user.id) {
      setFollowed(false);
      return;
    }
    let alive = true;
    userApi
      .profile(hostId)
      .then((p) => alive && setFollowed(p.following))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user?.id, hostId]);

  useEffect(() => {
    if (live) {
      setViewers(live.viewerCount);
      if (live.status === 'ENDED') setEnded(true);
    }
  }, [live]);

  // Tải tin nhắn cũ + mở WebSocket (token mới nhất; khách thì null, chỉ nghe). Rời màn thì đóng.
  useEffect(() => {
    liveApi.messages(liveId).then(setMessages).catch(() => {});

    const myId = user?.id;
    const onEvent = (e: LiveSocketEvent) => {
      switch (e.event) {
        case 'COMMENT':
          if (e.message) setMessages((list) => [...list, e.message!]);
          break;
        case 'REACTION':
          // Tim của chính mình đã bay lúc bấm rồi, không cho bay lần 2
          if (e.message?.sender.id !== myId) addHeart();
          break;
        case 'VIEWERS':
          if (e.viewerCount !== null) setViewers(e.viewerCount);
          break;
        case 'ENDED':
          setEnded(true);
          break;
      }
    };

    const conn = connectLive(liveId, getAuthToken(), onEvent, { onError: showNotice });
    connRef.current = conn;
    return () => {
      conn.close();
      connRef.current = null;
    };
  }, [liveId, user?.id, addHeart, showNotice]);

  const onHeart = () =>
    requireAuth(() => {
      if (ended) return;
      // Backend chỉ nhận 'heart' | 'like' | 'smile', không nhận emoji
      if (!connRef.current?.react('heart')) {
        showNotice(NOT_CONNECTED_TEXT);
        return;
      }
      setMyHearts((n) => n + 1);
      addHeart();
    });

  const onSend = () =>
    requireAuth(() => {
      const text = draft.trim();
      if (!text || ended) return;
      // Chưa kết nối xong → giữ nguyên chữ đã gõ để gửi lại
      if (!connRef.current?.chat(text)) {
        showNotice(NOT_CONNECTED_TEXT);
        return;
      }
      setDraft(''); // tin nhắn quay về qua sự kiện COMMENT
    });

  // Theo dõi / bỏ theo dõi người phát: đổi nút ngay rồi gọi API, lỗi thì trả lại như cũ
  const onFollow = () =>
    requireAuth(async () => {
      if (!live) return;
      const was = followed;
      setFollowed(!was);
      try {
        await (was ? userApi.unfollow(live.host.id) : userApi.follow(live.host.id));
      } catch (e) {
        setFollowed(was);
        Alert.alert('Lỗi', getErrorMessage(e));
      }
    });

  if (loading) return <Loading dark />;
  if (error || !live) {
    return (
      <Screen>
        <ErrorView message={error ?? 'Không tìm thấy buổi live'} onRetry={reload} />
      </Screen>
    );
  }

  const isMine = user?.id === live.host.id;
  const chatData = [...messages].reverse().slice(0, 50);
  const canSend = draft.trim().length > 0 && !ended;

  return (
    <Screen dark edges={[]}>
      <LiveVideo uri={live.sourceVideoUrl} paused={ended} />
      <LinearGradient colors={[liveColors.topShade, 'transparent']} style={styles.topShade} pointerEvents="none" />
      <LinearGradient colors={['transparent', liveColors.bottomShade]} style={styles.bottomShade} pointerEvents="none" />

      {/* Thanh trên: người phát + Theo dõi, LIVE, số người xem, nút đóng */}
      <View style={styles.topBar}>
        <View style={styles.hostPill}>
          <Pressable
            onPress={() => navigation.navigate('Profile', { userId: live.host.id })}
            style={styles.hostLink}
            accessibilityRole="button"
            accessibilityLabel={`Xem hồ sơ ${live.host.displayName}`}
          >
            <Avatar uri={live.host.avatarUrl} name={live.host.displayName} size={38} />
            <AppText weight="bold" size={13} color={colors.white} numberOfLines={1} style={styles.hostName}>
              {live.host.displayName}
            </AppText>
          </Pressable>
          {!isMine && (
            <Pressable
              onPress={onFollow}
              style={[styles.followBtn, followed && styles.followedBtn]}
              accessibilityRole="button"
              accessibilityState={{ selected: followed }}
            >
              <AppText weight="bold" size={12} color={colors.white}>{followed ? 'Đã theo dõi' : 'Theo dõi'}</AppText>
            </Pressable>
          )}
        </View>
        <View style={styles.liveBadge}>
          <AppText weight="bold" size={11} color={colors.white}>LIVE</AppText>
        </View>
        <View style={styles.viewerBadge} accessibilityLabel={`${viewers} người đang xem`}>
          <Ionicons name="eye-outline" size={14} color={colors.white} />
          <AppText weight="semibold" size={12} color={colors.white}>{formatCount(viewers)}</AppText>
        </View>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Rời live">
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
      </View>
      <View style={styles.titleTag}>
        <AppText size={12} color={colors.white} numberOfLines={1}>{live.title}</AppText>
      </View>

      <FloatingHearts hearts={hearts} bottom={306} right={24} />

      <KeyboardAvoidingView style={styles.bottomArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.middleRow}>
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
          {/* Nút thả tim + chia sẻ */}
          <View style={styles.sideButtons}>
            <Pressable onPress={onHeart} disabled={ended} style={[styles.heartBtn, ended && styles.disabled]} accessibilityRole="button" accessibilityLabel={`Thả tim, đã thả ${myHearts}`}>
              <Ionicons name="heart" size={24} color={colors.primary} />
              <AppText weight="semibold" size={11} color={colors.white}>{myHearts}</AppText>
            </Pressable>
            <Pressable onPress={comingSoon} style={styles.shareBtn} accessibilityRole="button" accessibilityLabel="Chia sẻ">
              <Ionicons name="share-outline" size={22} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <LiveNotice text={notice} />

        {/* Sản phẩm đang ghim */}
        {!!live.productName && (
          <View style={styles.productCard}>
            {live.productImageUrl ? (
              <Image source={{ uri: mediaUrl(live.productImageUrl) }} style={styles.productImg} />
            ) : (
              <View style={[styles.productImg, styles.productImgEmpty]}>
                <Ionicons name="pricetag-outline" size={24} color={colors.primaryText} />
              </View>
            )}
            <View style={styles.productInfo}>
              <AppText weight="bold" size={11} color={colors.primaryText}>Đang ghim</AppText>
              <AppText weight="semibold" size={14} numberOfLines={1}>{live.productName}</AppText>
              <AppText weight="bold" size={15}>{`${live.productPrice.toLocaleString('vi-VN')}đ`}</AppText>
            </View>
            <Button title="Mua ngay" size="sm" onPress={comingSoon} style={styles.buyBtn} />
          </View>
        )}

        {/* Ô bình luận */}
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onFocus={() => requireAuth()}
            placeholder="Nói gì đó…"
            placeholderTextColor={liveColors.placeholder}
            maxLength={LIVE_MESSAGE_MAX}
            onSubmitEditing={onSend}
            returnKeyType="send"
            editable={!ended}
            style={styles.input}
            accessibilityLabel="Bình luận"
          />
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Gửi"
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Người phát đã kết thúc */}
      {ended && (
        <View style={styles.endedOverlay}>
          <Ionicons name="videocam-off-outline" size={44} color={colors.white} />
          <AppText weight="bold" size={22} color={colors.white}>Live đã kết thúc</AppText>
          <AppText size={14} color={colors.white} align="center" style={styles.endedSub}>
            {`${live.host.displayName} đã kết thúc buổi live.`}
          </AppText>
          <Button title="Quay lại" onPress={() => navigation.goBack()} style={styles.endedBtn} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 420 },
  topBar: { position: 'absolute', top: 48, left: spacing.md, right: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hostPill: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 4, borderRadius: 24, backgroundColor: liveColors.pill },
  hostLink: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hostName: { flexShrink: 1 },
  followBtn: { height: 36, paddingHorizontal: spacing.md, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center' },
  followedBtn: { backgroundColor: liveColors.followed },
  liveBadge: { marginLeft: 'auto', height: 26, paddingHorizontal: spacing.sm, borderRadius: 6, backgroundColor: colors.live, justifyContent: 'center' },
  viewerBadge: { height: 26, paddingHorizontal: spacing.sm, borderRadius: 6, backgroundColor: colors.overlay, flexDirection: 'row', alignItems: 'center', gap: 4 },
  closeBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleTag: { position: 'absolute', top: 106, left: spacing.lg, maxWidth: '80%', height: 28, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: liveColors.input, justifyContent: 'center' },
  bottomArea: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 30, gap: spacing.lg },
  middleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  chat: { flex: 1, maxHeight: 200, flexGrow: 0 },
  sideButtons: { gap: 14, alignItems: 'center', marginRight: -4 },
  heartBtn: { width: 52, height: 60, borderRadius: 16, backgroundColor: liveColors.pill, alignItems: 'center', justifyContent: 'center', gap: 2 },
  shareBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: liveColors.pill, alignItems: 'center', justifyContent: 'center' },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: 10, borderRadius: 16, backgroundColor: colors.white },
  productImg: { width: 64, height: 64, borderRadius: 10 },
  productImgEmpty: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, gap: 1 },
  buyBtn: { height: 40, borderRadius: 10 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: liveColors.inputBorder, backgroundColor: liveColors.input, paddingHorizontal: 18, color: colors.white, fontFamily: fonts.regular, fontSize: 14 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  endedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: liveColors.summary, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  endedSub: { opacity: 0.8 },
  endedBtn: { marginTop: spacing.sm, height: 50, paddingHorizontal: 28 },
});
