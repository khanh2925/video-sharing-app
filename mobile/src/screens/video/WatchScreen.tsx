/**
 * Xem video — UC05, UC11
 * Phụ trách: Thanh
 *
 * - Lướt video toàn màn hình như TikTok: vuốt lên sang video kế, vuốt xuống về video trước (UC05).
 * - 3 tab ở đầu màn: "Trending" (nhiều lượt xem nhất, mặc định khi mở app), "Theo dõi" (video của người
 *   mình theo dõi) và "Dành cho bạn" (AI gợi ý theo gu). Hai tab sau cần đăng nhập.
 *   Danh sách lấy theo chỗ mở (route.params.source): trending, chủ đề, kết quả tìm kiếm, video của 1 người...
 *   Gần hết danh sách thì tự tải thêm trang (usePagedList).
 * - Chỉ video đang hiện trên màn mới phát (cùng nhạc nền); lượt xem tăng 1 lần cho mỗi video khi nó được phát.
 * - Chạm giữa màn để dừng / phát tiếp.
 * - Thả tim: đổi giao diện ngay rồi mới gọi API (optimistic), lỗi thì trả lại như cũ.
 * - Khách bấm thả tim / theo dõi → bảng "Đăng nhập để tiếp tục" (requireAuth).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppText, Avatar, ErrorView, Header, Loading, Screen } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { videoApi } from '../../api/videos';
import { aiApi } from '../../api/ai';
import { catalogApi, searchApi, userApi } from '../../api/catalog';
import { getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { usePagedList } from '../../hooks/usePagedList';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { useAppActive } from '../../hooks/useAppActive';
import { formatCount } from '../../utils/format';
import { ShareSheet } from './ShareSheet';
import { VideoPlaybackControls } from './VideoPlaybackControls';
import { mediaUrl } from '../../utils/media';
import type { PageResponse, Video } from '../../types/models';
import type { RootScreenProps, SearchTab, WatchSource } from '../../navigation/types';

/** 3 tab ở đầu màn Xem video */
type FeedKind = 'trending' | 'following' | 'forYou';
const FEEDS: { kind: FeedKind; label: string }[] = [
  { kind: 'trending', label: 'Trending' },
  { kind: 'following', label: 'Theo dõi' },
  { kind: 'forYou', label: 'Dành cho bạn' },
];

const EMPTY_PAGE: PageResponse<Video> = { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, last: true };

/** Gọi đúng API theo nguồn danh sách */
function fetchSource(source: WatchSource, page: number, size: number): Promise<PageResponse<Video>> {
  switch (source.kind) {
    case 'trending': return videoApi.trending(page, size);
    case 'following': return videoApi.following(page, size);
    // AI trả 1 danh sách duy nhất → gói thành 1 trang cuối cùng
    case 'forYou':
      return page > 0
        ? Promise.resolve(EMPTY_PAGE)
        : aiApi.forYou().then((content) => ({ ...EMPTY_PAGE, content, size: content.length, totalElements: content.length, totalPages: 1 }));
    case 'topic': return videoApi.byTopic(source.topicId, page, size);
    case 'search': return searchApi.search<Video>(source.q, 'videos', page, size);
    case 'user': return userApi.videos(source.userId, page, size);
    case 'liked': return userApi.liked(source.userId, page, size);
    case 'audio': return catalogApi.audioVideos(source.audioId, page, size);
    case 'history': return videoApi.myHistory(page, size);
  }
}

/** Mở hồ sơ: đã có màn Hồ sơ của người này trong stack thì quay về đó, tránh chồng màn trùng */
function openProfileOf(navigation: RootScreenProps<'Watch'>['navigation'], userId: number) {
  const exists = navigation.getState().routes.some(
    (r) => r.name === 'Profile' && (r.params as { userId?: number } | undefined)?.userId === userId,
  );
  if (exists) navigation.popTo('Profile', { userId });
  else navigation.navigate('Profile', { userId });
}

export default function WatchScreen({ navigation, route }: RootScreenProps<'Watch'>) {
  const { videoId, source } = route.params;
  const { user } = useAuth();
  const { height } = useWindowDimensions(); // mỗi video cao đúng 1 màn hình
  const sourceKey = JSON.stringify({ source: source ?? null, videoId });
  const feedRef = useRef<FlatList<Video>>(null);

  // Video được bấm mở (nếu có) + danh sách để vuốt tiếp
  const opened = useFetch(() => (videoId != null ? videoApi.getById(videoId) : Promise.resolve(null)), [videoId]);
  const list = usePagedList((page, size) => (source ? fetchSource(source, page, size) : Promise.resolve(EMPTY_PAGE)), [sourceKey, user?.id]);

  // Thả tim, số bình luận... đổi trên máy, ghi đè lên dữ liệu tải về (theo id video)
  const [patches, setPatches] = useState<Record<number, Partial<Video>>>({});
  const patch = useCallback(
    (id: number, change: Partial<Video>) => setPatches((prev) => ({ ...prev, [id]: { ...prev[id], ...change } })),
    [],
  );

  // Đăng nhập / đăng xuất khi đang xem → tải lại để cờ "đã thích" đúng với tài khoản mới
  const lastUserId = useRef(user?.id);
  useEffect(() => {
    if (lastUserId.current === user?.id) return;
    lastUserId.current = user?.id;
    setPatches({});
    if (videoId != null) opened.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const ready = (videoId == null || !!opened.data) && !list.loading;

  // Video đang mở không có trong trang đầu thì đặt lên đầu. Chỉ quyết định 1 lần,
  // để trang sau có chứa video đó cũng không làm lệch vị trí các video.
  // Gắn với sourceKey: đổi tab (đổi nguồn) thì tính lại từ đầu mà không phải dựng lại cả màn.
  const [placementState, setPlacement] = useState<{ key: string; prepend: boolean; startIndex: number } | null>(null);
  const placement = placementState?.key === sourceKey ? placementState : null;
  if (ready && placement === null) {
    const index = list.items.findIndex((v) => v.id === videoId);
    setPlacement({ key: sourceKey, prepend: videoId != null && index < 0, startIndex: Math.max(0, index) });
  }

  const videos = useMemo(() => {
    const withPatch = (v: Video) => (patches[v.id] ? { ...v, ...patches[v.id] } : v);
    if (videoId == null) return list.items.map(withPatch); // mở bằng tab: xem từ video đầu
    if (!opened.data) return [];
    const base = placement?.prepend
      ? [opened.data, ...list.items.filter((v) => v.id !== videoId)]
      : list.items;
    return base.map(withPatch);
  }, [opened.data, list.items, videoId, patches, placement]);
  const [active, setActive] = useState<{ key: string; index: number } | null>(null);
  const sourceKeyRef = useRef(sourceKey);
  useEffect(() => { sourceKeyRef.current = sourceKey; }, [sourceKey]);
  const current = (active?.key === sourceKey ? active.index : null) ?? placement?.startIndex ?? 0;

  const refreshVideos = async () => {
    // Bỏ video ghim khi mở từ một thẻ: lần làm mới bắt đầu từ trang mới nhất của nguồn.
    setPatches({});
    setActive({ key: sourceKey, index: 0 });
    feedRef.current?.scrollToOffset({ offset: 0, animated: false });
    if (videoId != null) {
      navigation.setParams({ videoId: undefined });
      // sourceKey đổi sẽ tự tải lại trang đầu và đặt lại vị trí video.
      return;
    }
    await list.refresh();
  };

  // Video nào hiện quá 80% màn hình thì là video đang xem
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 80 }), []);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setActive({ key: sourceKeyRef.current, index: first.index });
  }, []);

  // Các tab ở đầu màn: đổi nguồn danh sách ngay trên màn này (setParams), thanh trên đứng yên,
  // chỉ danh sách video tải lại. (Trước đây dùng replace nên cả màn dựng lại, thanh trên bị nháy.)
  const requireAuth = useRequireAuth();
  const insets = useSafeAreaInsets();
  const isFollowingFeed = source?.kind === 'following';
  const isForYouFeed = source?.kind === 'forYou';
  // Mở từ chủ đề, tìm kiếm, hồ sơ... thì không tab nào sáng
  const activeFeed = FEEDS.find((f) => f.kind === source?.kind)?.kind;
  const openFeed = (kind: FeedKind) => {
    if (kind === activeFeed) return;
    const go = () => navigation.setParams({ videoId: undefined, source: { kind } });
    if (kind === 'trending') go();
    else requireAuth(go); // khách → bảng đăng nhập
  };

  // Thanh trên dùng chung cho cả danh sách: quay lại · Trending | Theo dõi | Dành cho bạn · tìm kiếm
  const topBar = (
    <View style={[styles.topBar, { top: insets.top + spacing.xs }]}>
      <Pressable style={styles.iconBtn} onPress={navigation.goBack} accessibilityLabel="Quay lại">
        <Ionicons name="chevron-back" size={26} color={colors.white} />
      </Pressable>
      <View style={styles.feeds}>
        {FEEDS.map((f) => (
          <Pressable
            key={f.kind}
            style={styles.feedTab}
            onPress={() => openFeed(f.kind)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeFeed === f.kind }}
          >
            <AppText weight="semibold" size={15} color={colors.white} numberOfLines={1} style={activeFeed === f.kind ? styles.feedActive : styles.feedIdle}>
              {f.label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={styles.iconBtn}
        onPress={() => navigation.popTo('MainTabs', { screen: 'Search', params: { q: '', nonce: Date.now() } })}
        accessibilityLabel="Tìm kiếm"
      >
        <Ionicons name="search" size={22} color={colors.white} />
      </Pressable>
    </View>
  );

  // Quay lại từ màn Bình luận → lấy lại số bình luận của video đang xem
  const currentId = videos[current]?.id;
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (currentId == null) return;
      videoApi
        .getById(currentId)
        .then((fresh) => patch(currentId, { commentCount: fresh.commentCount }))
        .catch(() => {});
    }, [currentId, patch]),
  );

  if (!ready) {
    if (opened.error) {
      return (
        <Screen>
          <Header title="Xem video" />
          <ErrorView message={opened.error} onRetry={opened.reload} />
        </Screen>
      );
    }
    return (
      <Screen dark edges={[]}>
        <Loading dark />
        {topBar}
      </Screen>
    );
  }

  // Không tải được danh sách và cũng không có video nào để xem
  if (list.error && videos.length === 0) {
    return (
      <Screen>
        <Header title="Xem video" />
        <ErrorView message={list.error} onRetry={list.reload} />
      </Screen>
    );
  }

  // Danh sách trống: chưa theo dõi ai / AI chưa đủ dữ liệu để gợi ý / chưa có video
  if (videos.length === 0) {
    return (
      <Screen dark edges={[]}>
        <View style={styles.emptyFeed}>
          <Ionicons name="people-outline" size={48} color={colors.white} />
          <AppText weight="bold" size={18} color={colors.white} align="center">
            {isFollowingFeed
              ? 'Chưa có video từ người bạn theo dõi'
              : isForYouFeed
                ? 'Chưa đủ dữ liệu để gợi ý'
                : 'Chưa có video nào'}
          </AppText>
          {isForYouFeed && (
            <Pressable style={styles.emptyBtn} onPress={() => openFeed('trending')} accessibilityRole="button">
              <AppText weight="semibold" color={colors.white}>Xem Trending</AppText>
            </Pressable>
          )}
          {isFollowingFeed && (
            <Pressable style={styles.emptyBtn} onPress={() => navigation.popTo('MainTabs', { screen: 'Friends' })}>
              <AppText weight="semibold" color={colors.white}>Tìm người để theo dõi</AppText>
            </Pressable>
          )}
          <Pressable style={styles.emptyBtn} onPress={refreshVideos} accessibilityRole="button">
            <AppText weight="semibold" color={colors.white}>Tải lại video</AppText>
          </Pressable>
        </View>
        {topBar}
      </Screen>
    );
  }

  return (
    <Screen dark edges={[]}>
      <FlatList
        ref={feedRef}
        key={sourceKey}
        data={videos}
        keyExtractor={(v) => String(v.id)}
        renderItem={({ item, index }) => (
          <WatchContent
            video={item}
            active={index === current}
            height={height}
            onChange={(change) => patch(item.id, change)}
            navigation={navigation}
          />
        )}
        // Vuốt dừng đúng từng video, giống TikTok
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        initialScrollIndex={placement?.startIndex ?? 0}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // Chỉ giữ vài video quanh video đang xem cho nhẹ máy
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onEndReached={list.loadMore}
        onEndReachedThreshold={2}
        refreshControl={(
          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={refreshVideos}
            tintColor={colors.white}
            colors={[colors.primary]}
            progressViewOffset={insets.top + 48}
          />
        )}
      />
      {topBar}
      {/* Vẫn xem được video đang mở nhưng danh sách vuốt tiếp bị lỗi */}
      {!!list.error && (
        <Pressable
          style={[styles.retryPill, { top: insets.top + 56 }]}
          onPress={list.reload}
          accessibilityRole="button"
          accessibilityLabel="Tải lại danh sách video"
        >
          <Ionicons name="refresh" size={16} color={colors.white} />
          <AppText size={13} color={colors.white}>Không tải được danh sách. Thử lại</AppText>
        </Pressable>
      )}
    </Screen>
  );
}

interface ContentProps {
  video: Video;
  /** đang hiện trên màn hình → phát; còn lại dừng */
  active: boolean;
  height: number;
  onChange: (patch: Partial<Video>) => void;
  navigation: RootScreenProps<'Watch'>['navigation'];
}

/** Một trang video trong danh sách vuốt. Mỗi trang có trình phát riêng. */
function WatchContent({ video, active, height, onChange, navigation }: ContentProps) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const insets = useSafeAreaInsets();
  const [followed, setFollowed] = useState(false);
  // Đã theo dõi chủ video từ trước khi mở màn → ẩn nút "+" (null = chưa biết)
  const [followedBefore, setFollowedBefore] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const likeBusy = useRef(false);
  const followBusy = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- Trình phát video -----
  const player = useVideoPlayer(mediaUrl(video.videoUrl) ?? null, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25; // 0,25 giây báo vị trí 1 lần để vẽ thanh tiến độ
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const timeUpdate = useEvent(player, 'timeUpdate');

  // Nhạc nền chạy theo video: video dừng (chạm, rời màn, mở Bình luận) thì nhạc dừng.
  // Có nhạc thì tắt tiếng gốc của video
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const hasMusic = useBackgroundMusic(video.audio?.fileUrl, active && isFocused && appActive && isPlaying);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- expo-video yêu cầu thay đổi thuộc tính native player.
    player.muted = hasMusic;
  }, [player, hasMusic]);

  const togglePlay = () => (isPlaying ? player.pause() : player.play());

  // Chỉ phát khi video đang hiện và màn đang mở; vuốt đi hoặc sang màn khác (Hồ sơ, Bình luận...) thì dừng
  useEffect(() => {
    if (active && isFocused && appActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, active, isFocused, appActive]);

  // Vuốt sang video khác rồi quay lại thì phát lại từ đầu
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- Tua native player về đầu khi vuốt sang video khác.
    if (!active) player.currentTime = 0;
  }, [player, active]);

  // Tăng lượt xem đúng 1 lần cho mỗi video, khi nó được phát lần đầu
  const viewed = useRef(false);
  useEffect(() => {
    if (active && isFocused && isPlaying && !viewed.current) {
      viewed.current = true;
      videoApi.recordView(video.id).catch(() => {});
    }
  }, [active, isFocused, isPlaying, video.id]);

  // ----- Ghi hành vi xem cho AI gợi ý ("Dành cho bạn") -----
  // Chỉ cộng thời gian video thật sự đang phát trên màn (dừng, mở Bình luận, ra nền thì không tính)
  const watching = active && isFocused && appActive && isPlaying;
  const watchedMs = useRef(0);
  const watchingSince = useRef<number | null>(null);
  useEffect(() => {
    if (!watching) return;
    watchingSince.current = Date.now();
    return () => {
      if (watchingSince.current != null) watchedMs.current += Date.now() - watchingSince.current;
      watchingSince.current = null;
    };
  }, [watching]);

  // Nhớ độ dài video (ms) để gửi kèm; lúc rời màn trình phát có thể đã bị giải phóng
  const durationMs = useRef(0);
  useEffect(() => {
    if (player.duration > 0) durationMs.current = Math.round(player.duration * 1000);
  }, [player, timeUpdate]);

  // Mỗi lần xem = từ lúc video thành video đang xem tới lúc vuốt đi hoặc đóng màn → gửi đúng 1 sự kiện.
  // Xem dưới 2 giây là lướt qua (SKIP), còn lại là WATCH kèm thời gian đã xem.
  useEffect(() => {
    if (!active) return;
    watchedMs.current = 0;
    return () => {
      const running = watchingSince.current != null ? Date.now() - watchingSince.current : 0;
      const ms = watchedMs.current + running;
      if (ms < 2000) {
        aiApi.trackEvent({ videoId: video.id, type: 'SKIP' });
      } else {
        aiApi.trackEvent({
          videoId: video.id,
          type: 'WATCH',
          watchMs: ms,
          durationMs: durationMs.current > 0 ? durationMs.current : undefined,
        });
      }
    };
  }, [active, video.id]);

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
      if (likeBusy.current) return;
      likeBusy.current = true;
      const wasLiked = video.liked;
      onChange({ liked: !wasLiked, likeCount: video.likeCount + (wasLiked ? -1 : 1) });
      try {
        await (wasLiked ? videoApi.unlike(video.id) : videoApi.like(video.id));
      } catch (e) {
        onChange({ liked: wasLiked, likeCount: video.likeCount });
        Alert.alert('Lỗi', getErrorMessage(e));
      } finally {
        likeBusy.current = false;
      }
    });

  const isOwner = user?.id === video.owner.id;

  // ----- Theo dõi -----
  // Đã đăng nhập và không phải video của mình → hỏi hồ sơ chủ video xem mình đã theo dõi chưa
  useEffect(() => {
    if (user?.id == null || isOwner) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Xoá trạng thái theo dõi khi đổi tài khoản.
      setFollowedBefore(isOwner ? null : false);
      setFollowed(false);
      return;
    }
    let alive = true;
    userApi
      .profile(video.owner.id)
      .then((p) => alive && setFollowedBefore(p.following))
      .catch(() => alive && setFollowedBefore(false));
    return () => {
      alive = false;
    };
  }, [user?.id, isOwner, video.owner.id]);

  const onFollow = () =>
    requireAuth(async () => {
      if (followBusy.current) return;
      followBusy.current = true;
      const wasFollowed = followed;
      setFollowed(!wasFollowed);
      try {
        await (wasFollowed ? userApi.unfollow(video.owner.id) : userApi.follow(video.owner.id));
        flash(wasFollowed ? 'Đã bỏ theo dõi' : `Đã theo dõi ${video.owner.displayName}`);
      } catch (e) {
        setFollowed(wasFollowed);
        Alert.alert('Lỗi', getErrorMessage(e));
      } finally {
        followBusy.current = false;
      }
    });

  const openProfile = () => openProfileOf(navigation, video.owner.id);
  const openComments = () => navigation.navigate('Comments', { videoId: video.id, allowComments: video.allowComments });
  // popTo: quay về bộ tab có sẵn (navigate ở React Navigation 7 sẽ mở chồng thêm 1 bộ tab mới)
  // nonce: bấm lại cùng từ khoá vẫn tìm lại (dù ô tìm kiếm đã bị sửa)
  const searchTag = (q: string, tab: SearchTab = 'video') =>
    navigation.popTo('MainTabs', { screen: 'Search', params: { q, tab, nonce: Date.now() } });
  // Bấm tên bài nhạc / đĩa nhạc → màn Âm thanh (các video dùng cùng bài)
  const openAudio = () => video.audio && navigation.navigate('Audio', { audioId: video.audio.id });

  return (
    <View style={[styles.page, { height }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <LinearGradient colors={[colors.overlay, 'transparent']} style={styles.topShade} pointerEvents="none" />
      <LinearGradient colors={['transparent', colors.overlay]} style={styles.bottomShade} pointerEvents="none" />

      {/* Chạm giữa màn: dừng / phát */}
      <Pressable
        style={styles.playArea}
        onPress={togglePlay}
        accessibilityLabel={isPlaying ? 'Tạm dừng video' : 'Phát video'}
      >
        {!isPlaying && (
          <View style={styles.playIcon}>
            <Ionicons name="play" size={32} color={colors.white} />
          </View>
        )}
      </Pressable>


      {/* Cột nút bên phải */}
      <View style={styles.actions}>
        <View style={styles.ownerWrap}>
          <View style={styles.ownerAvatar}>
            <Avatar uri={video.owner.avatarUrl} name={video.owner.displayName} size={44} onPress={openProfile} accessibilityLabel={`Hồ sơ ${video.owner.displayName}`} />
          </View>
          {!isOwner && followedBefore === false && (
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

        <Pressable style={styles.action} onPress={() => requireAuth(() => setShareOpen(true))} accessibilityLabel="Chia sẻ">
          <Ionicons name="share-social-outline" size={28} color={colors.white} />
          <AppText weight="semibold" size={12} color={colors.white}>Chia sẻ</AppText>
        </Pressable>

        {video.audio && (
          <Pressable
            style={styles.disc}
            onPress={openAudio}
            accessibilityLabel={`Âm thanh: ${video.audio.title}`}
          >
            <Ionicons name="musical-note" size={16} color={colors.white} />
          </Pressable>
        )}
      </View>

      {/* Thông tin video phía dưới bên trái */}
      <View style={[styles.info, { bottom: 136 + insets.bottom + spacing.lg }]}>
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
          <Pressable style={styles.audioRow} onPress={openAudio}>
            <Ionicons name="musical-notes-outline" size={14} color={colors.white} />
            <AppText size={13} color={colors.white} numberOfLines={1}>
              {video.audio.title} · {video.audio.artist}
            </AppText>
          </Pressable>
        )}
      </View>

      {/* Thanh tiến độ + ô viết bình luận */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        <VideoPlaybackControls player={player} />
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

      {shareOpen && <ShareSheet visible videoId={video.id} onClose={() => setShareOpen(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', backgroundColor: colors.black, overflow: 'hidden' },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 170 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 360 },
  // Phủ cả trang để nút ▶ nằm đúng giữa màn hình (cột nút bên phải, chữ phía dưới vẽ sau nên vẫn bấm được)
  playArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  feeds: { flexDirection: 'row', gap: 2, flexShrink: 1 },
  feedTab: { height: 40, paddingHorizontal: 6, justifyContent: 'center' },
  feedIdle: { opacity: 0.7, paddingBottom: spacing.xs, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  feedActive: { paddingBottom: spacing.xs, borderBottomWidth: 2, borderBottomColor: colors.white },
  emptyFeed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  emptyBtn: { marginTop: spacing.sm, height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.xl, backgroundColor: colors.primary, justifyContent: 'center' },
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
  commentBox: { height: 44, borderRadius: radius.xl, backgroundColor: colors.whiteSoft, justifyContent: 'center', paddingHorizontal: spacing.lg },
  commentHint: { opacity: 0.85 },
  retryPill: {
    position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
    minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.overlay,
  },
  toast: { position: 'absolute', left: spacing.xl, right: spacing.xl, bottom: 160, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white },
});
