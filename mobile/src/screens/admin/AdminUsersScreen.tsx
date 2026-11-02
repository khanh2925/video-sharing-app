/**
 * Quản lý người dùng — UC16 (chỉ ADMIN).
 * - Ô tìm (tên đăng nhập, tên hiển thị, email; gõ xong 400ms mới tìm) + 3 bộ lọc: Tất cả / Hoạt động / Bị khoá.
 * - "Khoá" / "Mở khoá" hỏi xác nhận rồi gọi PUT /api/admin/users/{id}/lock | unlock.
 *   Tài khoản bị khoá không đăng nhập được, token cũ cũng bị từ chối (R2).
 * - Tài khoản quản trị không có nút khoá (R15).
 */
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Avatar, Button, EmptyView, ErrorView, Header, Loading, Screen, SegmentedTabs } from '../../components';
import { adminApi, type AdminUserFilter } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { usePagedList } from '../../hooks/usePagedList';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { confirmAsync } from '../../utils/confirm';
import type { AdminUser } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

const FILTERS: { key: AdminUserFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Hoạt động' },
  { key: 'LOCKED', label: 'Bị khoá' },
];

export default function AdminUsersScreen({ navigation, route }: RootScreenProps<'AdminUsers'>) {
  const [filter, setFilter] = useState<AdminUserFilter>(route.params?.status ?? 'ALL');
  const [q, setQ] = useState('');
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setKeyword(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const list = usePagedList((page, size) => adminApi.users(keyword, filter, page, size), [keyword, filter], 20);
  const [busyId, setBusyId] = useState<number | null>(null);

  const toggleLock = async (u: AdminUser) => {
    const lock = !u.locked;
    const ok = await confirmAsync(
      lock ? `Khoá tài khoản @${u.username}?` : `Mở khoá tài khoản @${u.username}?`,
      lock ? 'Người này sẽ bị đăng xuất và không đăng nhập lại được cho tới khi mở khoá.' : 'Người này đăng nhập lại được bình thường.',
      lock ? 'Khoá' : 'Mở khoá',
      lock,
    );
    if (!ok) return;
    setBusyId(u.id);
    try {
      const updated = await (lock ? adminApi.lockUser(u.id) : adminApi.unlockUser(u.id));
      // Đang lọc theo trạng thái thì dòng vừa đổi không còn thuộc bộ lọc → bỏ đi
      list.setItems((items) => filter === 'ALL'
        ? items.map((x) => (x.id === u.id ? updated : x))
        : items.filter((x) => x.id !== u.id));
    } catch (e) {
      Alert.alert(lock ? 'Khoá thất bại' : 'Mở khoá thất bại', getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <Header title="Quản lý người dùng" count={list.loading ? undefined : list.totalElements} />
      <View style={styles.tools}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Tìm tên, @tên đăng nhập hoặc email…"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        <SegmentedTabs variant="pill" tabs={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {list.loading ? (
        <Loading />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(u) => String(u.id)}
          renderItem={({ item }) => (
            <Row
              u={item}
              busy={busyId === item.id}
              onOpen={() => navigation.navigate('Profile', { userId: item.id })}
              onToggle={() => toggleLock(item)}
            />
          )}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={list.items.length === 0 ? styles.empty : styles.listContent}
          ListEmptyComponent={
            list.error ? <ErrorView message={list.error} onRetry={list.reload} />
              : <EmptyView icon="people-outline" title="Không có tài khoản nào" message={keyword ? 'Thử từ khoá khác' : undefined} />
          }
        />
      )}
    </Screen>
  );
}

function Row({ u, busy, onOpen, onToggle }: { u: AdminUser; busy: boolean; onOpen: () => void; onToggle: () => void }) {
  const admin = u.role === 'ADMIN';
  return (
    <View style={styles.row}>
      <Pressable onPress={onOpen} style={styles.who} accessibilityRole="button" accessibilityLabel={`Hồ sơ ${u.displayName}`}>
        <Avatar name={u.displayName} size={44} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <AppText weight="semibold" numberOfLines={1} style={styles.shrink}>{u.displayName}</AppText>
            {admin && <Tag text="Quản trị" bg={colors.primarySoft} fg={colors.primaryText} />}
            {u.locked && <Tag text="Bị khoá" bg="#FEE2E2" fg={colors.danger} />}
          </View>
          <AppText size={13} color={colors.muted} numberOfLines={1}>@{u.username} · {u.email}</AppText>
        </View>
      </Pressable>
      {!admin && (
        <Button
          title={u.locked ? 'Mở khoá' : 'Khoá'}
          size="sm"
          variant={u.locked ? 'outline' : 'danger'}
          icon={u.locked ? 'lock-open-outline' : 'lock-closed-outline'}
          loading={busy}
          onPress={onToggle}
        />
      )}
    </View>
  );
}

function Tag({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <AppText size={11} weight="semibold" color={fg}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tools: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 42, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  listContent: { paddingVertical: spacing.sm },
  empty: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shrink: { flexShrink: 1 },
  tag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full },
});
