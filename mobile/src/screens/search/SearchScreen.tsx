/**
 * Tìm kiếm — UC04
 * Phụ trách: Thanh
 *
 * - Ô tìm kiếm + 4 tab: Video · Tài khoản · Live · Âm thanh (GET /api/search?type=...).
 * - Chưa gõ gì: tab Video hiện video "Thịnh hành" (backend tự trả video nhiều lượt xem nhất).
 * - "Có thể bạn quan tâm": hashtag gợi ý từ GET /api/search/suggestions, bấm vào thì tìm theo hashtag.
 * - Màn khác mở tab này kèm từ khoá: navigation.navigate('MainTabs', { screen: 'Search', params: { q: '#meo' } })
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Avatar, Button, Chip, EmptyView, ErrorView, Loading, Screen, SegmentedTabs, UserRow } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { searchApi } from '../../api/catalog';
import { useFetch } from '../../hooks/useFetch';
import { usePagedList } from '../../hooks/usePagedList';
import { formatCount } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { Audio, LiveStream, SearchType, UserSummary, Video } from '../../types/models';
import type { TabScreenProps } from '../../navigation/types';

type TabKey = 'video' | 'user' | 'live' | 'audio';
type SearchItem = Video | UserSummary | LiveStream | Audio;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'video', label: 'Video' },
  { key: 'user', label: 'Tài khoản' },
  { key: 'live', label: 'Live' },
  { key: 'audio', label: 'Âm thanh' },
];

/** Tab trên màn → giá trị ?type= của API */
const TYPE_OF: Record<TabKey, SearchType> = { video: 'videos', user: 'accounts', live: 'streaming', audio: 'audio' };

/** Tab Video tải mỗi lần 4 video, bấm "Xem thêm video" tải tiếp (giống design) */
const VIDEO_PAGE_SIZE = 4;

export default function SearchScreen({ navigation, route }: TabScreenProps<'Search'>) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [q, setQ] = useState(route.params?.q ?? '');
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [tab, setTab] = useState<TabKey>('video');
  // TODO (Long): gọi API theo dõi khi backend có. Tạm giữ trạng thái theo dõi trong máy.
  const [following, setFollowing] = useState<Record<number, boolean>>({});

  // Màn khác mở tab Tìm kiếm kèm từ khoá (bấm hashtag ở màn Xem video)
  useEffect(() => {
    if (route.params?.q !== undefined) {
      setQ(route.params.q);
      setTab('video');
    }
  }, [route.params?.q]);

  // Gõ xong 400ms mới gọi API, tránh gọi liên tục mỗi lần gõ 1 chữ
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(timer);
  }, [q]);

  // "#meo" → tìm "meo"
  const keyword = debouncedQ.trim().replace(/^#/, '');
  const list = usePagedList<SearchItem>(
    (page, size) => searchApi.search<SearchItem>(keyword, TYPE_OF[tab], page, size),
    [keyword, tab],
    tab === 'video' ? VIDEO_PAGE_SIZE : 20,
  );
  const tags = useFetch(() => searchApi.suggestions(''), []);

  const toggleFollow = (id: number) =>
    requireAuth(() => setFollowing((prev) => ({ ...prev, [id]: !prev[id] })));

  // ----- Từng loại kết quả -----
  const renderItem = ({ item }: { item: SearchItem }) => {
    switch (tab) {
      case 'video': {
        const v = item as Video;
        return <VideoCard video={v} onPress={() => navigation.navigate('Watch', { videoId: v.id })} />;
      }
      case 'user': {
        const u = item as UserSummary;
        const on = !!following[u.id];
        return (
          <UserRow
            user={u}
            onPress={() => navigation.navigate('Profile', { userId: u.id })}
            right={
              user?.id === u.id ? null : (
                <Button
                  title={on ? 'Đang theo dõi' : 'Theo dõi'}
                  size="sm"
                  variant={on ? 'secondary' : 'primary'}
                  onPress={() => toggleFollow(u.id)}
                  style={styles.followBtn}
                />
              )
            }
          />
        );
      }
      case 'live': {
        const l = item as LiveStream;
        return <LiveCard live={l} onPress={() => navigation.navigate('LiveWatch', { liveId: l.id })} />;
      }
      case 'audio': {
        const m = item as Audio;
        return (
          <View style={styles.audioRow}>
            {m.coverUrl ? (
              <Image source={{ uri: mediaUrl(m.coverUrl) }} style={styles.audioCover} />
            ) : (
              <View style={[styles.audioCover, styles.center]}>
                <Ionicons name="musical-notes" size={22} color={colors.primary} />
              </View>
            )}
            <View style={styles.flex}>
              <AppText weight="semibold" size={14} numberOfLines={1}>{m.title}</AppText>
              <AppText size={12} color={colors.muted} numberOfLines={1}>{m.artist}</AppText>
            </View>
            <Button
              title="Quay với nhạc này"
              size="sm"
              variant="outline"
              onPress={() => requireAuth(() => navigation.navigate('Camera', { audio: m }))}
            />
          </View>
        );
      }
    }
  };

  // Phần dưới danh sách: nút "Xem thêm video" + hashtag gợi ý (chỉ tab Video)
  const renderFooter = () => {
    if (list.loadingMore) return <ActivityIndicator color={colors.primary} style={styles.moreLoading} />;
    if (tab !== 'video') return null;
    return (
      <View>
        {!list.isLast && list.items.length > 0 && (
          <Pressable style={styles.moreBtn} onPress={list.loadMore}>
            <AppText weight="semibold" size={14} color={colors.primaryText}>Xem thêm video</AppText>
            <Ionicons name="chevron-down" size={16} color={colors.primaryText} />
          </Pressable>
        )}
        {!!tags.data?.length && (
          <View style={styles.tagSection}>
            <AppText weight="bold" size={16}>Có thể bạn quan tâm</AppText>
            <View style={styles.tagWrap}>
              {tags.data.map((name) => (
                <Chip key={name} label={`#${name}`} tone="blue" onPress={() => setQ(`#${name}`)} />
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const isGrid = tab === 'video' || tab === 'live';

  return (
    <Screen>
      {/* Ô tìm kiếm */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Tìm video, tài khoản…"
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Tìm video, tài khoản, âm thanh"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => setDebouncedQ(q)}
            style={styles.searchInput}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} style={styles.clearBtn} accessibilityLabel="Xoá từ khoá">
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Loại kết quả */}
      <View style={styles.tabs}>
        <SegmentedTabs variant="pill" tabs={TABS} value={tab} onChange={setTab} />
      </View>

      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorView message={list.error} onRetry={list.reload} />
      ) : (
        <FlatList
          key={isGrid ? 'grid' : 'list'} // đổi số cột thì FlatList phải tạo lại
          data={list.items}
          numColumns={isGrid ? 2 : 1}
          keyExtractor={(item) => `${tab}-${item.id}`}
          renderItem={renderItem}
          columnWrapperStyle={isGrid ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          // Tab Video tải thêm bằng nút, các tab khác tự tải khi cuộn tới cuối
          onEndReached={tab === 'video' ? undefined : list.loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            tab === 'video' && keyword.length === 0 ? (
              <AppText weight="bold" size={16} style={styles.sectionTitle}>Thịnh hành</AppText>
            ) : undefined
          }
          ListEmptyComponent={<EmptyView icon="search-outline" title="Không tìm thấy kết quả" message="Thử từ khoá khác" />}
          ListFooterComponent={renderFooter() ?? undefined}
        />
      )}
    </Screen>
  );
}

/** Ô video 2 cột: ảnh bìa + lượt xem/thích, tiêu đề 2 dòng, người đăng */
function VideoCard({ video, onPress }: { video: Video; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityLabel={video.title}>
      <View style={styles.cardThumb}>
        {video.thumbnailUrl ? (
          <Image source={{ uri: mediaUrl(video.thumbnailUrl) }} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Ionicons name="videocam-outline" size={28} color={colors.placeholder} />
          </View>
        )}
        <LinearGradient colors={['transparent', colors.overlay]} style={styles.cardStats}>
          <AppText size={11} color={colors.white}>{formatCount(video.viewCount)} lượt xem</AppText>
          <AppText size={11} color={colors.white}>{formatCount(video.likeCount)} thích</AppText>
        </LinearGradient>
      </View>
      <AppText weight="semibold" size={14} numberOfLines={2}>{video.title}</AppText>
      <View style={styles.cardOwner}>
        <Avatar uri={video.owner.avatarUrl} name={video.owner.displayName} size={22} />
        <AppText size={12} color={colors.muted} numberOfLines={1} style={styles.flex}>{video.owner.displayName}</AppText>
      </View>
    </Pressable>
  );
}

/** Ô live 2 cột: nhãn LIVE, số người xem, tiêu đề + người phát */
function LiveCard({ live, onPress }: { live: LiveStream; onPress: () => void }) {
  return (
    <Pressable style={[styles.card, styles.cardThumb]} onPress={onPress} accessibilityLabel={`Live: ${live.title}`}>
      {live.thumbnailUrl ? (
        <Image source={{ uri: mediaUrl(live.thumbnailUrl) }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Ionicons name="radio-outline" size={28} color={colors.placeholder} />
        </View>
      )}
      <View style={styles.liveBadge}>
        <AppText weight="bold" size={11} color={colors.white}>LIVE</AppText>
      </View>
      <View style={styles.viewerBadge}>
        <AppText size={11} color={colors.white}>{formatCount(live.viewerCount)} xem</AppText>
      </View>
      <LinearGradient colors={['transparent', colors.overlay]} style={styles.liveInfo}>
        <AppText weight="semibold" size={13} color={colors.white} numberOfLines={1}>{live.title}</AppText>
        <AppText size={11} color={colors.white} numberOfLines={1}>{live.host.displayName}</AppText>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  searchRow: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 14 },
  searchBox: {
    height: 46, borderRadius: radius.lg, backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: spacing.xs,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  clearBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabs: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 },
  sectionTitle: { paddingBottom: spacing.md },
  gridRow: { gap: spacing.md, marginBottom: 18 },
  card: { flex: 1, gap: spacing.sm, minWidth: 0 },
  cardThumb: { height: 232, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  cardStats: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 20, paddingHorizontal: 10, paddingBottom: spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  cardOwner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: colors.live, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6 },
  viewerBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.overlay, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6 },
  liveInfo: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 28, paddingHorizontal: 10, paddingBottom: 10 },
  followBtn: { minWidth: 104 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  audioCover: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.primarySoft },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, marginTop: spacing.xs },
  moreLoading: { marginVertical: spacing.lg },
  tagSection: { marginTop: spacing.lg, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
