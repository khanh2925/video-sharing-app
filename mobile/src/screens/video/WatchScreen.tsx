/**
 * Xem video — UC05, UC11
 * Phụ trách: Thanh
 *
 * - Video tràn màn hình, phát lặp (expo-video). Chạm giữa màn để dừng / phát tiếp.
 * - Mở màn thì tăng lượt xem 1 lần (POST /videos/{id}/view).
 * - Thả tim: đổi giao diện ngay rồi mới gọi API (optimistic), lỗi thì trả lại như cũ.
 * - Khách bấm thả tim / theo dõi → bảng "Đăng nhập để tiếp tục" (requireAuth).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppText, Avatar, ErrorView, Loading, Screen } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { videoApi } from '../../api/videos';
import { getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { formatCount } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { Video } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

/** Nền trắng mờ cho ô "Viết bình luận…", thanh tiến độ (theme chưa có màu này) */
const WHITE_SOFT = 'rgba(255,255,255,0.16)';
const WHITE_TRACK = 'rgba(255,255,255,0.3)';

const soon = () => Alert.alert('Thông báo', 'Tính năng sẽ có ở phiên bản sau');

export default function WatchScreen({ navigation, route }: RootScreenProps<'Watch'>) {
  const { videoId } = route.params;
  const { data: video, setData: setVideo, loading, error, reload } = useFetch(() => videoApi.getById(videoId), [videoId]);

  // Tăng lượt xem đúng 1 lần khi mở màn
  useEffect(() => {
    videoApi.recordView(videoId).catch(() => {});
  }, [videoId]);

  // Quay lại từ màn Bình luận → lấy lại số bình luận mới
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      videoApi
        .getById(videoId)
        .then((fresh) => setVideo((prev) => (prev ? { ...prev, commentCount: fresh.commentCount } : fresh)))
        .catch(() => {});
    }, [videoId, setVideo]),
  );

  if (loading && !video) {
    return (
      <Screen dark edges={[]}>
        <Loading dark />
      </Screen>
    );
  }
  if (error || !video) {
    return (
      <Screen>
        <ErrorView message={error ?? 'Không tìm thấy video'} onRetry={reload} />
      </Screen>
    );
  }
  return (
    <WatchContent
      video={video}
      onChange={(patch) => setVideo((prev) => (prev ? { ...prev, ...patch } : prev))}
      navigation={navigation}
    />
  );
}

interface ContentProps {
  video: Video;
  onChange: (patch: Partial<Video>) => void;
  navigation: RootScreenProps<'Watch'>['navigation'];
}

/** Tách riêng để useVideoPlayer nhận được đường dẫn video ngay từ đầu (đã tải xong video) */
function WatchContent({ video, onChange, navigation }: ContentProps) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const insets = useSafeAreaInsets();
  const [followed, setFollowed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- Trình phát video -----
  const player = useVideoPlayer(mediaUrl(video.videoUrl) ?? null, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25; // 0,25 giây báo vị trí 1 lần để vẽ thanh tiến độ
    p.play();
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const timeUpdate = useEvent(player, 'timeUpdate');
  const progress = player.duration > 0 && timeUpdate ? Math.min(1, timeUpdate.currentTime / player.duration) : 0;

  const togglePlay = () => (isPlaying ? player.pause() : player.play());

  // Sang màn khác (Hồ sơ, Bình luận...) thì dừng video, quay lại thì phát tiếp
  useFocusEffect(
    useCallback(() => {
      player.play();
      return () => player.pause();
    }, [player]),
  );

  // Rời màn thì huỷ hẹn giờ ẩn thông báo
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  // ----- Thả tim (optimistic) -----
  const onLike = () =>
    requireAuth(async () => {
      const wasLiked = video.liked;
      onChange({ liked: !wasLiked, likeCount: video.likeCount + (wasLiked ? -1 : 1) });
      try {
        await (wasLiked ? videoApi.unlike(video.id) : videoApi.like(video.id));
      } catch (e) {
        onChange({ liked: wasLiked, likeCount: video.likeCount });
        Alert.alert('Lỗi', getErrorMessage(e));
      }
    });

  // ----- Theo dõi -----
  const onFollow = () =>
    requireAuth(() => {
      // TODO (Long): gọi API theo dõi khi backend có
      setFollowed((f) => !f);
      flash(followed ? 'Đã bỏ theo dõi' : `Đã theo dõi ${video.owner.displayName}`);
    });

  const isOwner = user?.id === video.owner.id;
  const openProfile = () => navigation.navigate('Profile', { userId: video.owner.id });
  const openComments = () => navigation.navigate('Comments', { videoId: video.id });
  const searchTag = (q: string) => navigation.navigate('MainTabs', { screen: 'Search', params: { q } });

  return (
    <Screen dark edges={[]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <LinearGradient colors={[colors.overlay, 'transparent']} style={styles.topShade} pointerEvents="none" />
      <LinearGradient colors={['transparent', colors.overlay]} style={styles.bottomShade} pointerEvents="none" />

      {/* Chạm giữa màn: dừng / phát */}
      <Pressable
        style={[styles.playArea, { top: insets.top + 60 }]}
        onPress={togglePlay}
        accessibilityLabel={isPlaying ? 'Tạm dừng video' : 'Phát video'}
      >
        {!isPlaying && (
          <View style={styles.playIcon}>
            <Ionicons name="play" size={32} color={colors.white} />
          </View>
        )}
      </Pressable>

      {/* Thanh trên: quay lại · nguồn video · tìm kiếm */}
      <View style={[styles.topBar, { top: insets.top + spacing.xs }]}>
        <Pressable style={styles.iconBtn} onPress={navigation.goBack} accessibilityLabel="Quay lại">
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <View style={styles.feeds}>
          {/* Màn này chỉ xem 1 video; bấm tab nguồn thì về Trang chủ để lướt feed */}
          <Pressable style={styles.feedTab} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
            <AppText weight="semibold" color={colors.white} style={styles.feedIdle}>Đang theo dõi</AppText>
          </Pressable>
          <Pressable style={styles.feedTab} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
            <AppText weight="semibold" color={colors.white} style={styles.feedActive}>Dành cho bạn</AppText>
          </Pressable>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => searchTag('')} accessibilityLabel="Tìm kiếm">
          <Ionicons name="search" size={22} color={colors.white} />
        </Pressable>
      </View>

      {/* Cột nút bên phải */}
      <View style={styles.actions}>
        <View style={styles.ownerWrap}>
          <View style={styles.ownerAvatar}>
            <Avatar uri={video.owner.avatarUrl} name={video.owner.displayName} size={44} onPress={openProfile} />
          </View>
          {!isOwner && (
            <Pressable
              style={[styles.followBtn, { backgroundColor: followed ? colors.muted : colors.primary }]}
              onPress={onFollow}
              accessibilityLabel={followed ? `Bỏ theo dõi ${video.owner.displayName}` : `Theo dõi ${video.owner.displayName}`}
            >
              <Ionicons name={followed ? 'checkmark' : 'add'} size={13} color={colors.white} />
            </Pressable>
          )}
        </View>

        <Pressable style={styles.action} onPress={onLike} accessibilityLabel={video.liked ? 'Bỏ thích' : 'Thích'}>
          <Ionicons name={video.liked ? 'heart' : 'heart-outline'} size={32} color={video.liked ? colors.primary : colors.white} />
          <AppText weight="semibold" size={12} color={colors.white}>{formatCount(video.likeCount)}</AppText>
        </Pressable>

        <Pressable style={styles.action} onPress={openComments} accessibilityLabel={`Bình luận, ${video.commentCount}`}>
          <Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.white} />
          <AppText weight="semibold" size={12} color={colors.white}>{formatCount(video.commentCount)}</AppText>
        </Pressable>

        <Pressable style={styles.action} onPress={soon} accessibilityLabel="Chia sẻ">
          <Ionicons name="share-social-outline" size={28} color={colors.white} />
          <AppText weight="semibold" size={12} color={colors.white}>Chia sẻ</AppText>
        </Pressable>

        {video.audio && (
          <Pressable
            style={styles.disc}
            onPress={() => searchTag(video.audio!.title)}
            accessibilityLabel={`Âm thanh: ${video.audio.title}`}
          >
            <Ionicons name="musical-note" size={16} color={colors.white} />
          </Pressable>
        )}
      </View>

      {/* Thông tin video phía dưới bên trái */}
      <View style={[styles.info, { bottom: 72 + insets.bottom + spacing.lg }]}>
        <Pressable onPress={openProfile} style={styles.selfStart}>
          <AppText weight="bold" size={17} color={colors.white}>{video.owner.displayName}</AppText>
        </Pressable>
        <AppText size={14} color={colors.white} numberOfLines={3}>
          {video.description || video.title}
          {video.hashtags.map((tag) => (
            <AppText key={tag} weight="semibold" size={14} color={colors.white} onPress={() => searchTag(`#${tag}`)}>
              {` #${tag}`}
            </AppText>
          ))}
        </AppText>
        {video.audio && (
          <Pressable style={styles.audioRow} onPress={() => searchTag(video.audio!.title)}>
            <Ionicons name="musical-notes-outline" size={14} color={colors.white} />
            <AppText size={13} color={colors.white} numberOfLines={1}>
              {video.audio.title} · {video.audio.artist}
            </AppText>
          </Pressable>
        )}
      </View>

      {/* Thanh tiến độ + ô viết bình luận */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.track} accessibilityLabel="Tiến độ video">
          <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        </View>
        <Pressable style={styles.commentBox} onPress={openComments}>
          <AppText size={14} color={colors.white} style={styles.commentHint}>
            {video.allowComments ? 'Viết bình luận…' : 'Tác giả đã tắt bình luận'}
          </AppText>
        </Pressable>
      </View>

      {!!toast && (
        <View style={styles.toast} pointerEvents="none">
          <AppText size={14} align="center">{toast}</AppText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 170 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 360 },
  playArea: { position: 'absolute', left: 0, right: 80, bottom: 260, alignItems: 'center', justifyContent: 'center' },
  playIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  feeds: { flexDirection: 'row', gap: 6 },
  feedTab: { height: 40, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  feedIdle: { opacity: 0.7, paddingBottom: spacing.xs, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  feedActive: { paddingBottom: spacing.xs, borderBottomWidth: 2, borderBottomColor: colors.white },
  actions: { position: 'absolute', right: 10, bottom: 150, alignItems: 'center', gap: spacing.lg },
  ownerWrap: { width: 48, height: 60, alignItems: 'center' },
  ownerAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  followBtn: {
    position: 'absolute', top: 36, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  action: { minWidth: 44, minHeight: 44, alignItems: 'center', gap: 2 },
  disc: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.text, borderWidth: 6, borderColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { position: 'absolute', left: spacing.lg, right: 84, gap: spacing.sm },
  selfStart: { alignSelf: 'flex-start' },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md },
  track: { height: 3, borderRadius: 2, backgroundColor: WHITE_TRACK, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: colors.white },
  commentBox: { height: 44, borderRadius: radius.xl, backgroundColor: WHITE_SOFT, justifyContent: 'center', paddingHorizontal: spacing.lg },
  commentHint: { opacity: 0.85 },
  toast: { position: 'absolute', left: spacing.xl, right: spacing.xl, bottom: 160, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white },
});
