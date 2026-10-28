/**
 * Video của tôi — UC10
 * Phụ trách: Khánh
 *
 * Xem lại video của chính mình (mở từ Hồ sơ của tôi): phát video, xem số liệu,
 * menu ⋯ có Sửa video (→ EditVideo) và Xoá video (hỏi xác nhận rồi quay lại).
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, BottomSheet, ErrorView, Loading, Screen } from '../../components';
import { videoApi } from '../../api/videos';
import { getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { colors, radius, spacing } from '../../constants/theme';
import { formatCount, timeAgo, visibilityLabel } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { RootScreenProps } from '../../navigation/types';
import { FilterOverlay } from './FilterScreen';

/** Màu mờ trên nền video (theme chưa có token cho màu trong suốt) */
const PLAY_ICON_COLOR = 'rgba(255,255,255,0.85)';
const BOTTOM_SHADE_COLOR = 'rgba(0,0,0,0.72)';
/** Đợi bảng menu đóng hẳn rồi mới hiện Alert (iOS không hiện Alert khi Modal đang đóng) */
const SHEET_CLOSE_DELAY = 300;

export default function MyVideoScreen({ navigation, route }: RootScreenProps<'MyVideo'>) {
  const { videoId } = route.params;
  const insets = useSafeAreaInsets();
  const { data: video, setData, loading, error, reload } = useFetch(() => videoApi.getById(videoId), [videoId]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  // Trình phát: có video rồi mới nạp nguồn, phát lặp lại
  const player = useVideoPlayer(mediaUrl(video?.videoUrl) ?? null, (p) => {
    p.loop = true;
    p.play();
  });

  // Quay lại từ màn Sửa thì lấy lại dữ liệu mới (không hiện vòng xoay, bỏ qua lần đầu)
  const firstFocus = useRef(true);
  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      videoApi.getById(videoId).then(setData).catch(() => {});
    });
  }, [navigation, videoId, setData]);

  // Rời màn thì dừng phát, quay lại thì phát tiếp (nếu chưa bấm tạm dừng)
  useEffect(() => navigation.addListener('blur', () => player.pause()), [navigation, player]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(
    () => navigation.addListener('focus', () => {
      if (!pausedRef.current) player.play();
    }),
    [navigation, player],
  );

  // Nhạc nền chạy theo video; có nhạc thì tắt tiếng gốc của video
  const isFocused = useIsFocused();
  const hasMusic = useBackgroundMusic(video?.audio?.fileUrl, isFocused && !paused && !deleting);
  useEffect(() => {
    player.muted = hasMusic;
  }, [player, hasMusic]);

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
      setPaused(true);
    } else {
      player.play();
      setPaused(false);
    }
  };

  const openEdit = () => {
    setMenuOpen(false);
    navigation.navigate('EditVideo', { videoId });
  };

  const askDelete = () => {
    setMenuOpen(false);
    setTimeout(showDeleteAlert, SHEET_CLOSE_DELAY);
  };

  const showDeleteAlert = () => {
    Alert.alert('Xoá video này?', 'Lượt thích và bình luận cũng bị xoá.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await videoApi.remove(videoId);
            navigation.goBack();
          } catch (e) {
            setDeleting(false);
            Alert.alert('Xoá thất bại', getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const backButton = (
    <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Quay lại">
      <Ionicons name="chevron-back" size={28} color={colors.white} />
    </Pressable>
  );

  if (loading || deleting) {
    return (
      <Screen dark>
        <Loading dark />
      </Screen>
    );
  }

  if (error || !video) {
    return (
      <Screen>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Quay lại">
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <ErrorView message={error ?? 'Không tìm thấy video'} onRetry={reload} />
      </Screen>
    );
  }

  return (
    <Screen dark edges={[]}>
      <View style={styles.root}>
        {/* Chạm vào video để tạm dừng / phát tiếp */}
        <Pressable style={StyleSheet.absoluteFill} onPress={togglePlay} accessibilityLabel={paused ? 'Phát video' : 'Tạm dừng'}>
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
          <FilterOverlay name={video.filter} />
        </Pressable>
        {paused && (
          <View style={styles.pauseIcon} pointerEvents="none">
            <Ionicons name="play" size={64} color={PLAY_ICON_COLOR} />
          </View>
        )}
        <LinearGradient colors={[colors.overlay, 'transparent']} style={styles.topShade} pointerEvents="none" />
        <LinearGradient colors={['transparent', BOTTOM_SHADE_COLOR]} style={styles.bottomShade} pointerEvents="none" />

        {/* Thanh trên: quay lại + menu ⋯ */}
        <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
          {backButton}
          <Pressable onPress={() => setMenuOpen(true)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Tuỳ chọn video">
            <Ionicons name="ellipsis-horizontal" size={26} color={colors.white} />
          </Pressable>
        </View>

        {/* Cột số liệu bên phải */}
        <View style={[styles.stats, { bottom: insets.bottom + 150 }]}>
          <View style={styles.stat} accessibilityLabel={`${video.likeCount} lượt thích`}>
            <Ionicons name="heart" size={30} color={colors.white} />
            <AppText weight="semibold" size={12} color={colors.white}>{formatCount(video.likeCount)}</AppText>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Comments', { videoId })}
            style={styles.stat}
            accessibilityRole="button"
            accessibilityLabel={`Bình luận, ${video.commentCount}`}
          >
            <Ionicons name="chatbubble-ellipses" size={28} color={colors.white} />
            <AppText weight="semibold" size={12} color={colors.white}>{formatCount(video.commentCount)}</AppText>
          </Pressable>
        </View>

        {/* Tiêu đề và thông tin */}
        <View style={[styles.caption, { bottom: insets.bottom + 40 }]}>
          {video.status === 'DRAFT' && (
            <View style={styles.draftBadge}>
              <AppText weight="semibold" size={12} color={colors.white}>Bản nháp</AppText>
            </View>
          )}
          <AppText weight="bold" size={17} color={colors.white} numberOfLines={2}>{video.title}</AppText>
          {video.audio && (
            <View style={styles.musicRow}>
              <Ionicons name="musical-notes" size={14} color={colors.white} />
              <AppText size={13} color={colors.white} numberOfLines={1} style={styles.musicText}>
                {`${video.audio.title} · ${video.audio.artist}`}
              </AppText>
            </View>
          )}
          <View style={styles.metaRow}>
            <AppText size={13} color={colors.white}>{`${formatCount(video.viewCount)} lượt xem`}</AppText>
            <AppText size={13} color={colors.white}>{visibilityLabel[video.visibility]}</AppText>
            <AppText size={13} color={colors.white}>{timeAgo(video.createdAt)}</AppText>
          </View>
        </View>
      </View>

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} heightPercent={24}>
        <Pressable onPress={openEdit} style={styles.menuItem} accessibilityRole="button">
          <Ionicons name="create-outline" size={22} color={colors.text} />
          <AppText weight="semibold" size={15}>Sửa video</AppText>
        </Pressable>
        <Pressable onPress={askDelete} style={styles.menuItem} accessibilityRole="button">
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
          <AppText weight="semibold" size={15} color={colors.danger}>Xoá video</AppText>
        </Pressable>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pauseIcon: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 140 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 320 },
  topBar: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stats: { position: 'absolute', right: 10, alignItems: 'center', gap: 18 },
  stat: { minWidth: 44, alignItems: 'center', gap: 2 },
  caption: { position: 'absolute', left: spacing.lg, right: 84, gap: spacing.sm },
  draftBadge: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  musicText: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, opacity: 0.9 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: spacing.md, borderRadius: radius.md },
});
