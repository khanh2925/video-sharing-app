/**
 * Hồ sơ — UC06, UC12
 * Phụ trách: Long
 *
 * Hồ sơ của người khác: avatar (có vòng xanh nếu đang có story), số liệu, Theo dõi / Nhắn tin,
 * nút mở "Gợi ý cho bạn", 2 tab "Video" / "Đã thích". Khách xem được, bấm Theo dõi thì hiện bảng đăng nhập.
 * Theo dõi / bỏ theo dõi: đổi nút ngay rồi gọi API (optimistic), lỗi thì trả lại như cũ.
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Avatar,
  Button,
  EmptyView,
  ErrorView,
  Header,
  Loading,
  Screen,
  SegmentedTabs,
  VideoThumb,
} from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { useFetch } from '../../hooks/useFetch';
import { usePagedList } from '../../hooks/usePagedList';
import { userApi } from '../../api/catalog';
import { storyApi } from '../../api/stories';
import { getErrorMessage } from '../../api/client';
import { formatCount } from '../../utils/format';
import type { RootScreenProps } from '../../navigation/types';
import type { FollowUser, UserProfile } from '../../types/models';

type Tab = 'videos' | 'liked';

const GAP = 2;
const COLUMNS = 3;

const soon = () => Alert.alert('Thông báo', 'Tính năng sẽ có ở phiên bản sau');

export default function ProfileScreen({ navigation, route }: RootScreenProps<'Profile'>) {
  const { userId } = route.params;
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const { width } = useWindowDimensions();
  const cellWidth = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  const [tab, setTab] = useState<Tab>('videos');
  const [suggestOpen, setSuggestOpen] = useState(true);

  const profile = useFetch(() => userApi.profile(userId), [userId, user?.id]);
  // Gợi ý tài khoản để theo dõi (API cần đăng nhập, khách thì để trống)
  const suggestions = useFetch(() => (user ? userApi.suggestions(10) : Promise.resolve([] as FollowUser[])), [user?.id]);
  // Story của người này (chỉ có khi đã đăng nhập vì API story cần token)
  const stories = useFetch(() => (user ? storyApi.feed() : Promise.resolve([])), [user?.id]);
  const list = usePagedList(
    (page, size) => (tab === 'videos' ? userApi.videos(userId, page, size) : userApi.liked(userId, page, size)),
    [tab, userId, user?.id],
    12,
  );

  if (profile.loading) {
    return (
      <Screen>
        <Header title="" />
        <Loading />
      </Screen>
    );
  }
  if (profile.error || !profile.data) {
    return (
      <Screen>
        <Header title="Hồ sơ" />
        <ErrorView message={profile.error ?? 'Không tải được hồ sơ'} onRetry={profile.reload} />
      </Screen>
    );
  }

  const p: UserProfile = profile.data;
  const storyGroup = (stories.data ?? []).find((g) => g.owner.id === p.id);

  const followed = p.following;
  const followerCount = p.followerCount;
  // Bỏ chính người đang xem hồ sơ ra khỏi gợi ý
  const suggestList = (suggestions.data ?? []).filter((u) => u.id !== p.id);

  // Theo dõi / bỏ theo dõi người này, cập nhật luôn số người theo dõi
  const toggleFollow = () =>
    requireAuth(async () => {
      const was = p.following;
      const patch = (following: boolean, followerCount: number) =>
        profile.setData((prev) => (prev ? { ...prev, following, followerCount } : prev));
      patch(!was, p.followerCount + (was ? -1 : 1));
      try {
        await (was ? userApi.unfollow(p.id) : userApi.follow(p.id));
      } catch (e) {
        patch(was, p.followerCount);
        Alert.alert('Lỗi', getErrorMessage(e));
      }
    });

  // Theo dõi / bỏ theo dõi một tài khoản trong "Gợi ý cho bạn"
  const toggleSuggest = (u: FollowUser) =>
    requireAuth(async () => {
      const was = u.following;
      const patch = (following: boolean) =>
        suggestions.setData((prev) => prev?.map((x) => (x.id === u.id ? { ...x, following } : x)) ?? prev);
      patch(!was);
      try {
        await (was ? userApi.unfollow(u.id) : userApi.follow(u.id));
      } catch (e) {
        patch(was);
        Alert.alert('Lỗi', getErrorMessage(e));
      }
    });

  const header = (
    <View>
      <View style={styles.top}>
        <Avatar
          uri={p.avatarUrl}
          name={p.displayName}
          size={104}
          ring={storyGroup ? (storyGroup.allViewed ? 'seen' : 'unseen') : 'none'}
          onPress={storyGroup ? () => navigation.navigate('StoryView', { ownerId: p.id }) : undefined}
          accessibilityLabel={storyGroup ? `Xem tin của ${p.displayName}` : undefined}
        />
        <View style={styles.center}>
          <AppText weight="bold" size={18} align="center">{p.displayName}</AppText>
          {!!p.bio && <AppText size={13} color={colors.muted} align="center" style={styles.bio}>{p.bio}</AppText>}
        </View>

        <View style={styles.stats}>
          <Stat value={formatCount(p.followingCount)} label="Đang theo dõi" />
          <Stat value={formatCount(followerCount)} label="Người theo dõi" />
          <Stat value={formatCount(p.likeCount)} label="Lượt thích" />
        </View>

        {p.me ? (
          // Mở trúng hồ sơ của chính mình
          <Button title="Sửa hồ sơ" variant="secondary" onPress={() => navigation.navigate('EditProfile')} style={styles.actionFull} />
        ) : (
          <View style={styles.actions}>
            <Button
              title={followed ? 'Đang theo dõi' : 'Theo dõi'}
              variant={followed ? 'secondary' : 'primary'}
              onPress={toggleFollow}
              style={styles.action}
            />
            <Button title="Nhắn tin" variant="secondary" onPress={soon} style={styles.action} />
            <Pressable
              onPress={() => setSuggestOpen((o) => !o)}
              style={styles.chevronBtn}
              accessibilityRole="button"
              accessibilityLabel="Gợi ý tài khoản"
              accessibilityState={{ expanded: suggestOpen }}
            >
              <Ionicons name={suggestOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Gợi ý cho bạn: thẻ ngang */}
      {!p.me && suggestOpen && suggestList.length > 0 && (
        <View style={styles.suggest}>
          <View style={styles.suggestHeader}>
            <AppText weight="bold" size={14}>Gợi ý cho bạn</AppText>
            <Pressable
              onPress={() => requireAuth(() => navigation.popTo('MainTabs', { screen: 'Friends' }))}
              hitSlop={8}
              accessibilityRole="link"
            >
              <AppText weight="semibold" size={13} color={colors.primaryText}>Xem tất cả</AppText>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
            {suggestList.map((u) => {
              const on = u.following;
              return (
                <View key={u.id} style={styles.suggestCard}>
                  <Avatar
                    uri={u.avatarUrl}
                    name={u.displayName}
                    size={60}
                    onPress={() => navigation.push('Profile', { userId: u.id })}
                    accessibilityLabel={`Hồ sơ ${u.displayName}`}
                  />
                  <AppText weight="semibold" size={13} numberOfLines={1}>{u.displayName}</AppText>
                  <AppText size={11} color={colors.muted}>{`${formatCount(u.followerCount)} theo dõi`}</AppText>
                  <Button
                    title={on ? 'Đang theo dõi' : 'Theo dõi'}
                    size="sm"
                    variant={on ? 'secondary' : 'primary'}
                    onPress={() => toggleSuggest(u)}
                    style={styles.suggestBtn}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.tabs}>
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'videos', label: 'Video' },
            { key: 'liked', label: 'Đã thích' },
          ]}
        />
      </View>
    </View>
  );

  return (
    <Screen>
      <Header title={`@${p.username}`} />
      <FlatList
        data={list.loading || list.error ? [] : list.items}
        keyExtractor={(v) => String(v.id)}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => (
          <VideoThumb video={item} width={cellWidth} onPress={() => navigation.navigate('Watch', { videoId: item.id, source: { kind: tab === 'videos' ? 'user' : 'liked', userId } })} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorView message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyView
              icon={tab === 'videos' ? 'videocam-outline' : 'heart-outline'}
              title={tab === 'videos' ? 'Chưa có video nào' : 'Chưa thích video nào'}
            />
          )
        }
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} style={styles.more} /> : undefined}
        refreshing={list.refreshing}
        onRefresh={() => {
          profile.reload();
          suggestions.reload();
          list.refresh();
        }}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.5}
      />
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText weight="bold" size={17}>{value}</AppText>
      <AppText size={12} color={colors.muted}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: 10, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  center: { alignItems: 'center' },
  bio: { marginTop: spacing.xs },
  stats: { flexDirection: 'row', marginTop: 6 },
  stat: { width: 100, alignItems: 'center' },
  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: spacing.sm, marginTop: 6 },
  action: { flex: 1, height: 44, borderRadius: radius.md },
  actionFull: { alignSelf: 'stretch', height: 44, borderRadius: radius.md, marginTop: 6 },
  chevronBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  suggest: { paddingTop: spacing.lg },
  suggestHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: 10 },
  suggestRow: { gap: 10, paddingHorizontal: spacing.xl },
  suggestCard: {
    width: 132,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  suggestBtn: { alignSelf: 'stretch', paddingHorizontal: spacing.xs },
  tabs: { marginTop: 18 },
  gridContent: { gap: GAP, paddingBottom: spacing.xxl },
  more: { marginVertical: spacing.lg },
});
