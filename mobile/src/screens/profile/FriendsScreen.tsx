/**
 * Bạn bè — UC12
 * Phụ trách: Long
 *
 * Tab "Bạn bè" ở thanh dưới (thiết kế gọi là "Follow"). Ô tìm theo tên, 2 tab
 * "Đang theo dõi" / "Người theo dõi", nút Theo dõi / Theo dõi lại / Bạn bè, và mục "Gợi ý cho bạn".
 * Số trên 2 tab lấy thật từ hồ sơ; danh sách người tạm dùng dữ liệu mẫu vì backend chưa có API.
 */
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, EmptyView, Screen, SegmentedTabs, UserRow } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { useFetch } from '../../hooks/useFetch';
import { userApi } from '../../api/catalog';
import { formatCount } from '../../utils/format';
import type { TabScreenProps } from '../../navigation/types';
import type { UserSummary } from '../../types/models';

type Tab = 'following' | 'followers';

// TODO (Long): thay bằng API khi backend có (GET /users/{id}/following, /followers, gợi ý).
// id âm để không trùng người thật; bấm vào dòng mẫu chưa mở hồ sơ.
const SAMPLE_FOLLOWERS: UserSummary[] = [
  { id: -1, username: 'lan.nguyen', displayName: 'Lan Nguyễn', avatarUrl: null },
  { id: -2, username: 'minhtran', displayName: 'Minh Trần', avatarUrl: null },
  { id: -3, username: 'shophoa', displayName: 'Shop Hoa', avatarUrl: null },
  { id: -4, username: 'mochi.dog', displayName: 'Bé Mochi', avatarUrl: null },
];
const SAMPLE_FOLLOWING: UserSummary[] = [
  { id: -2, username: 'minhtran', displayName: 'Minh Trần', avatarUrl: null },
  { id: -3, username: 'shophoa', displayName: 'Shop Hoa', avatarUrl: null },
  { id: -5, username: 'anpham', displayName: 'An Phạm', avatarUrl: null },
  { id: -6, username: 'quan.le', displayName: 'Quân', avatarUrl: null },
];
const SAMPLE_SUGGESTIONS: (UserSummary & { note: string })[] = [
  { id: -7, username: 'corgi.club', displayName: 'Corgi Club', avatarUrl: null, note: 'Lan Nguyễn cũng theo dõi' },
  { id: -8, username: 'phuotcungvy', displayName: 'Phượt cùng Vy', avatarUrl: null, note: 'Nổi bật trong Du lịch' },
];
/** Ai đang theo dõi mình (để biết khi nào hiện "Bạn bè" = theo dõi qua lại) */
const followerIds = new Set(SAMPLE_FOLLOWERS.map((u) => u.id));

export default function FriendsScreen({ navigation }: TabScreenProps<'Friends'>) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  const [tab, setTab] = useState<Tab>('followers');
  const [query, setQuery] = useState('');
  // Mình đang theo dõi ai (id → true). Ban đầu = danh sách Đang theo dõi mẫu.
  // TODO (Long): thay bằng API follow / unfollow khi backend có.
  const [followed, setFollowed] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(SAMPLE_FOLLOWING.map((u) => [u.id, true])),
  );
  const [hidden, setHidden] = useState<Record<number, boolean>>({});

  // Số người theo dõi / đang theo dõi lấy thật từ hồ sơ của mình
  const profile = useFetch(() => (user ? userApi.profile(user.id) : Promise.resolve(null)), [user?.id]);
  const stats = profile.data;

  const toggleFollow = (id: number) => requireAuth(() => setFollowed((f) => ({ ...f, [id]: !f[id] })));

  // Lọc theo ô tìm kiếm (tên hoặc username)
  const key = query.trim().toLowerCase();
  const source = tab === 'followers' ? SAMPLE_FOLLOWERS : SAMPLE_FOLLOWING;
  const people = source.filter((u) => !key || `${u.displayName} ${u.username}`.toLowerCase().includes(key));
  const suggestions = SAMPLE_SUGGESTIONS.filter((u) => !hidden[u.id]);

  // Nhãn nút: đã theo dõi → "Bạn bè" (nếu họ cũng theo dõi mình) / "Đang theo dõi";
  // chưa theo dõi → "Theo dõi lại" (ở tab Người theo dõi) / "Theo dõi"
  const buttonLabel = (u: UserSummary) => {
    if (followed[u.id]) return followerIds.has(u.id) ? 'Bạn bè' : 'Đang theo dõi';
    return tab === 'followers' ? 'Theo dõi lại' : 'Theo dõi';
  };

  const openProfile = (u: UserSummary) => {
    if (u.id > 0) navigation.navigate('Profile', { userId: u.id }); // dữ liệu mẫu (id âm) chưa có hồ sơ
  };

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
            subtitle={u.note}
            onPress={() => openProfile(u)}
            right={
              <View style={styles.suggestRight}>
                <Button
                  title={followed[u.id] ? 'Đang theo dõi' : 'Theo dõi'}
                  size="sm"
                  variant={followed[u.id] ? 'secondary' : 'primary'}
                  onPress={() => toggleFollow(u.id)}
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
        data={people}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const on = !!followed[item.id];
          return (
            <UserRow
              user={item}
              onPress={() => openProfile(item)}
              right={
                <Button
                  title={buttonLabel(item)}
                  size="sm"
                  variant={on ? 'secondary' : 'primary'}
                  onPress={() => toggleFollow(item.id)}
                  style={[styles.followBtn, on && styles.followBtnOn]}
                />
              }
            />
          );
        }}
        ListEmptyComponent={<EmptyView icon="people-outline" title="Không tìm thấy ai" />}
        ListFooterComponent={suggestSection}
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
  hideBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
