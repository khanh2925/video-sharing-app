/**
 * Bạn bè — UC12
 * Phụ trách: Long
 *
 * Tab "Bạn bè" ở thanh dưới (thiết kế gọi là "Follow"). Ô tìm theo tên, 2 tab
 * "Đang theo dõi" / "Người theo dõi", nút Theo dõi / Theo dõi lại / Bạn bè, và mục "Gợi ý cho bạn".
 * Số trên 2 tab lấy từ hồ sơ của mình; 2 danh sách và "Gợi ý cho bạn" lấy từ API theo dõi (UC12).
 * Ô tìm chỉ lọc trong những người đã tải về.
 */
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, EmptyView, ErrorView, Loading, Screen, SegmentedTabs, UserRow } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { useFetch } from '../../hooks/useFetch';
import { usePagedList } from '../../hooks/usePagedList';
import { userApi } from '../../api/catalog';
import { getErrorMessage } from '../../api/client';
import { followLabel, formatCount } from '../../utils/format';
import type { TabScreenProps } from '../../navigation/types';
import type { FollowUser, PageResponse } from '../../types/models';

type Tab = 'following' | 'followers';

/** Trang rỗng, dùng khi chưa đăng nhập */
const EMPTY_PAGE: PageResponse<FollowUser> = { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, last: true };

export default function FriendsScreen({ navigation }: TabScreenProps<'Friends'>) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  const [tab, setTab] = useState<Tab>('followers');
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<Record<number, boolean>>({}); // gợi ý đã bấm X (chỉ ẩn trên máy)

  // Số người theo dõi / đang theo dõi lấy từ hồ sơ của mình
  const profile = useFetch(() => (user ? userApi.profile(user.id) : Promise.resolve(null)), [user?.id]);
  const stats = profile.data;

  // Danh sách của tab đang chọn (có phân trang)
  const list = usePagedList(
    (page, size) => {
      if (!user) return Promise.resolve(EMPTY_PAGE);
      return tab === 'followers' ? userApi.followers(user.id, page, size) : userApi.following(user.id, page, size);
    },
    [tab, user?.id],
    20,
  );

  // Gợi ý tài khoản để theo dõi
  const suggest = useFetch(() => (user ? userApi.suggestions(10) : Promise.resolve([] as FollowUser[])), [user?.id]);

  // Quay lại tab này (sau khi theo dõi ở màn khác) → tải lại số và danh sách
  const refreshRef = useRef(() => {});
  refreshRef.current = () => {
    profile.reload();
    list.refresh();
    suggest.reload();
  };
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refreshRef.current();
    }, []),
  );

  // Đổi cờ following của 1 người ở cả danh sách lẫn gợi ý
  const setFollowFlag = (id: number, following: boolean) => {
    list.setItems((prev) => prev.map((u) => (u.id === id ? { ...u, following } : u)));
    suggest.setData((prev) => prev?.map((u) => (u.id === id ? { ...u, following } : u)) ?? prev);
  };

  // Theo dõi / bỏ theo dõi: đổi nút ngay rồi gọi API, lỗi thì trả lại như cũ. Xong thì cập nhật số trên tab.
  const toggleFollow = (u: FollowUser) =>
    requireAuth(async () => {
      const was = u.following;
      setFollowFlag(u.id, !was);
      try {
        await (was ? userApi.unfollow(u.id) : userApi.follow(u.id));
        profile.reload();
      } catch (e) {
        setFollowFlag(u.id, was);
        Alert.alert('Lỗi', getErrorMessage(e));
      }
    });

  // Lọc theo ô tìm kiếm (tên hoặc username) trong những người đã tải
  const key = query.trim().toLowerCase();
  const people = list.items.filter((u) => !key || `${u.displayName} ${u.username}`.toLowerCase().includes(key));
  const suggestions = (suggest.data ?? []).filter((u) => !hidden[u.id]);

  const openProfile = (u: FollowUser) => navigation.navigate('Profile', { userId: u.id });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'following', label: `${stats ? formatCount(stats.followingCount) : ''} Đang theo dõi`.trim() },
    { key: 'followers', label: `${stats ? formatCount(stats.followerCount) : ''} Người theo dõi`.trim() },
  ];

  const suggestSection =
    suggestions.length > 0 ? (
      <View style={styles.suggest}>
        <AppText weight="bold" size={14} style={styles.suggestTitle}>Gợi ý cho bạn</AppText>
        {suggestions.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            subtitle={u.followsMe ? 'Đang theo dõi bạn' : `${formatCount(u.followerCount)} người theo dõi`}
            onPress={() => openProfile(u)}
            right={
              <View style={styles.suggestRight}>
                <Button
                  title={followLabel(u)}
                  size="sm"
                  variant={u.following ? 'secondary' : 'primary'}
                  onPress={() => toggleFollow(u)}
                />
                <Pressable
                  onPress={() => setHidden((h) => ({ ...h, [u.id]: true }))}
                  style={styles.hideBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Ẩn gợi ý ${u.displayName}`}
                >
                  <Ionicons name="close" size={18} color={colors.placeholder} />
                </Pressable>
              </View>
            }
          />
        ))}
      </View>
    ) : undefined;

  return (
    <Screen>
      {/* Tiêu đề + ô tìm */}
      <View style={styles.header}>
        <AppText weight="bold" size={22} style={styles.title}>Bạn bè</AppText>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm theo tên…"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
            accessibilityLabel="Tìm bạn bè"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Xoá ô tìm">
              <Ionicons name="close-circle" size={18} color={colors.placeholder} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.tabs}>
        <SegmentedTabs value={tab} onChange={setTab} tabs={tabs} />
      </View>

      <FlatList
        data={list.loading || list.error ? [] : people}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const on = item.following;
          return (
            <UserRow
              user={item}
              onPress={() => openProfile(item)}
              right={
                item.me ? undefined : (
                  <Button
                    title={followLabel(item)}
                    size="sm"
                    variant={on ? 'secondary' : 'primary'}
                    onPress={() => toggleFollow(item)}
                    style={[styles.followBtn, on && styles.followBtnOn]}
                  />
                )
              }
            />
          );
        }}
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorView message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyView
              icon="people-outline"
              title={key ? 'Không tìm thấy ai' : tab === 'followers' ? 'Chưa có người theo dõi' : 'Chưa theo dõi ai'}
            />
          )
        }
        ListFooterComponent={
          <>
            {list.loadingMore && <ActivityIndicator color={colors.primary} style={styles.more} />}
            {suggestSection}
          </>
        }
        refreshing={list.refreshing}
        onRefresh={() => refreshRef.current()}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.5}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  title: { marginBottom: spacing.md },
  searchBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, paddingVertical: 0 },
  tabs: { marginTop: spacing.md },
  list: { paddingTop: 6, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  followBtn: { minWidth: 112 },
  followBtnOn: { borderColor: colors.border },
  suggest: {
    marginTop: spacing.sm,
    marginHorizontal: -spacing.xl,
    paddingTop: 14,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 8,
    borderTopColor: colors.surface,
  },
  suggestTitle: { marginBottom: spacing.xs },
  suggestRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  more: { marginVertical: spacing.lg },
  hideBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
