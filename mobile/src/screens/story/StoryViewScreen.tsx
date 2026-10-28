/**
 * Xem story — UC18
 * Phụ trách: Khánh
 *
 * - Mở từ thanh story ở Trang chủ: navigation.navigate('StoryView', { ownerId }).
 * - Tải GET /stories/feed, tìm nhóm story của ownerId, phát lần lượt từng story.
 * - Mỗi story chạy trong durationSec giây, có 1 thanh tiến độ riêng ở trên cùng.
 * - Chạm bên trái: story trước. Chạm bên phải: story sau. Hết nhóm này thì sang nhóm người kế tiếp.
 * - Story nào hiện lên thì báo backend "đã xem" (POST /stories/{id}/view).
 *
 * File này còn export StoryProgressBars, StoryMedia, useStoryProgress để MyStoryScreen dùng lại.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppText, Avatar, Button, ErrorView, Loading, Screen } from '../../components';
import { colors, spacing } from '../../constants/theme';
import { storyApi } from '../../api/stories';
import { useFetch } from '../../hooks/useFetch';
import { timeAgo } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { Story } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

/** Màu thanh tiến độ chưa chạy tới (theme chưa có màu trắng mờ) */
const TRACK = 'rgba(255,255,255,0.35)';

export default function StoryViewScreen({ navigation, route }: RootScreenProps<'StoryView'>) {
  const { ownerId } = route.params;
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useFetch(() => storyApi.feed(), []);

  // Chỉ lướt qua story của người khác (nhóm của mình xem ở màn MyStory), trừ khi mở đúng nhóm của mình
  const groups = useMemo(
    () => (data ?? []).filter((g) => g.stories.length > 0 && (!g.mine || g.owner.id === ownerId)),
    [data, ownerId],
  );

  const [groupIndex, setGroupIndex] = useState(-1);
  const [storyIndex, setStoryIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0); // bấm "Xem lại" thì tăng để thanh tiến độ chạy lại từ đầu

  // Tải xong: mở nhóm của ownerId, bắt đầu từ story đầu tiên chưa xem
  useEffect(() => {
    if (!data) return;
    const gi = groups.findIndex((g) => g.owner.id === ownerId);
    if (gi < 0) return;
    const firstUnseen = groups[gi].stories.findIndex((s) => !s.viewed);
    setGroupIndex(gi);
    setStoryIndex(firstUnseen >= 0 ? firstUnseen : 0);
  }, [data, groups, ownerId]);

  const group = groups[groupIndex];
  const story: Story | undefined = group?.stories[storyIndex];

  // Báo backend đã xem (mỗi story 1 lần)
  const marked = useRef(new Set<number>());
  useEffect(() => {
    if (!story || !group || group.mine || story.viewed || marked.current.has(story.id)) return;
    marked.current.add(story.id);
    storyApi.markViewed(story.id).catch(() => {});
  }, [story, group]);

  const goNext = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1); // sang người kế tiếp
      setStoryIndex(0);
    } else {
      setDone(true); // hết story
    }
  };

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  };

  const progress = useStoryProgress(story ? `${story.id}-${round}` : null, story?.durationSec ?? 0, done, goNext);

  if (loading) {
    return (
      <Screen dark edges={[]}>
        <Loading dark />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <ErrorView message={error} onRetry={reload} />
      </Screen>
    );
  }
  if (!group || !story) {
    return (
      <Screen dark>
        <View style={styles.center}>
          <AppText color={colors.white} align="center">Story không còn nữa (có thể đã hết hạn)</AppText>
          <Button title="Đóng" onPress={navigation.goBack} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen dark edges={[]}>
      <StoryMedia story={story} paused={done} />
      <LinearGradient colors={[colors.overlay, 'transparent']} style={styles.topShade} pointerEvents="none" />

      {/* Vùng chạm: trái 35% = lùi, phải 65% = tới */}
      <View style={[styles.tapRow, { top: insets.top + 100 }]}>
        <Pressable style={styles.tapPrev} onPress={goPrev} accessibilityLabel="Story trước" />
        <Pressable style={styles.tapNext} onPress={goNext} accessibilityLabel="Story tiếp theo" />
      </View>

      <View style={[styles.top, { top: insets.top + spacing.sm }]}>
        <StoryProgressBars count={group.stories.length} current={storyIndex} progress={progress} />
        <View style={styles.headerRow}>
          <Pressable
            style={styles.owner}
            onPress={() => navigation.navigate('Profile', { userId: group.owner.id })}
          >
            <View style={styles.avatarBorder}>
              <Avatar uri={group.owner.avatarUrl} name={group.owner.displayName} size={32} />
            </View>
            <AppText weight="bold" size={14} color={colors.white}>{group.owner.displayName}</AppText>
          </Pressable>
          <AppText size={13} color={colors.white} style={styles.time}>{timeAgo(story.createdAt)}</AppText>
          <View style={styles.flex} />
          <Pressable style={styles.closeBtn} onPress={navigation.goBack} accessibilityLabel="Đóng story">
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {/* Xem hết story của mọi người */}
      {done && (
        <View style={styles.doneOverlay}>
          <AppText weight="bold" size={17} color={colors.white}>Bạn đã xem hết tin mới</AppText>
          <Button title="Về trang chủ" onPress={navigation.goBack} style={styles.doneBtn} />
          <Pressable
            style={styles.replayBtn}
            onPress={() => {
              setStoryIndex(0);
              setRound((r) => r + 1);
              setDone(false);
            }}
          >
            <AppText weight="semibold" size={14} color={colors.white}>Xem lại</AppText>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

// =====================================================================
// Phần dùng chung với MyStoryScreen
// =====================================================================

/**
 * Chạy thanh tiến độ của story hiện tại từ 0 → 1 trong durationSec giây, chạy xong gọi onFinish.
 * storyKey đổi (sang story khác) thì chạy lại từ đầu. paused = true thì dừng tại chỗ.
 */
export function useStoryProgress(storyKey: string | null, durationSec: number, paused: boolean, onFinish: () => void) {
  const progress = useRef(new Animated.Value(0)).current;
  const valueRef = useRef(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  // Lưu lại vị trí đang chạy để dừng rồi chạy tiếp đúng chỗ
  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      valueRef.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  // Sang story mới → về 0
  useEffect(() => {
    progress.setValue(0);
    valueRef.current = 0;
  }, [storyKey, progress]);

  useEffect(() => {
    if (!storyKey || paused || durationSec <= 0) return;
    const remaining = (1 - valueRef.current) * durationSec * 1000;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: false, // đổi width nên không dùng native driver
    });
    anim.start(({ finished }) => {
      if (finished) finishRef.current();
    });
    return () => anim.stop();
  }, [storyKey, paused, durationSec, progress]);

  return progress;
}

/** Hàng thanh tiến độ: thanh đã xem trắng, thanh đang xem chạy dần, thanh chưa xem mờ */
export function StoryProgressBars({ count, current, progress }: { count: number; current: number; progress: Animated.Value }) {
  return (
    <View style={styles.bars} accessibilityLabel={`Story ${current + 1} trên ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.bar}>
          {i < current && <View style={styles.barFull} />}
          {i === current && (
            <Animated.View
              style={[styles.barFull, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

/** Nội dung 1 story: ảnh hoặc video tràn màn */
export function StoryMedia({ story, paused }: { story: Story; paused: boolean }) {
  if (story.mediaType === 'VIDEO') {
    // key = id: sang story video khác thì tạo trình phát mới
    return <StoryVideo key={story.id} uri={mediaUrl(story.mediaUrl) ?? ''} paused={paused} />;
  }
  return <Image source={{ uri: mediaUrl(story.mediaUrl) }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
}

function StoryVideo({ uri, paused }: { uri: string; paused: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: 32 },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 160 },
  tapRow: { position: 'absolute', left: 0, right: 0, bottom: 60, flexDirection: 'row' },
  tapPrev: { width: '35%' },
  tapNext: { flex: 1 },
  top: { position: 'absolute', left: spacing.md, right: spacing.md, gap: spacing.md },
  bars: { flexDirection: 'row', gap: spacing.xs },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: TRACK, overflow: 'hidden' },
  barFull: { height: '100%', width: '100%', backgroundColor: colors.white },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  owner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBorder: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  time: { opacity: 0.85 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  doneOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.overlay,
    alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: 32,
  },
  doneBtn: { paddingHorizontal: spacing.xxl },
  replayBtn: { height: 44, paddingHorizontal: spacing.lg, justifyContent: 'center' },
});
