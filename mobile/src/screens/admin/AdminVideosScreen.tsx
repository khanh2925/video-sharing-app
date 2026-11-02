/**
 * Kiểm duyệt video — UC15 (chỉ ADMIN).
 * - Ô tìm (tiêu đề hoặc tên tác giả, gõ xong 400ms mới tìm) + 3 bộ lọc: Tất cả / Đang hiện / Đã ẩn.
 * - Mỗi dòng: ảnh bìa, tiêu đề, tác giả, lượt xem, trạng thái. Bấm dòng video đang hiện → xem thử.
 * - "Ẩn" hỏi xác nhận rồi gọi PUT /api/admin/videos/{id}/hide. Ẩn rồi không bỏ ẩn được (R15, C4).
 */
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, EmptyView, ErrorView, Header, Loading, Screen, SegmentedTabs } from '../../components';
import { adminApi, type AdminVideoFilter } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { usePagedList } from '../../hooks/usePagedList';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { formatCount, timeAgo } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import { confirmAsync } from '../../utils/confirm';
import type { Video } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

const FILTERS: { key: AdminVideoFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PUBLISHED', label: 'Đang hiện' },
  { key: 'HIDDEN', label: 'Đã ẩn' },
];

export default function AdminVideosScreen({ navigation, route }: RootScreenProps<'AdminVideos'>) {
  const [filter, setFilter] = useState<AdminVideoFilter>(route.params?.status ?? 'ALL');
  const [q, setQ] = useState('');
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setKeyword(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const list = usePagedList((page, size) => adminApi.videos(keyword, filter, page, size), [keyword, filter], 20);
  const [busyId, setBusyId] = useState<number | null>(null);

  const hide = async (v: Video) => {
    if (!(await confirmAsync(`Ẩn video “${v.title}”?`, 'Video sẽ biến khỏi trang chủ, tìm kiếm và hồ sơ. Không bỏ ẩn được.', 'Ẩn'))) return;
    setBusyId(v.id);
    try {
      const updated = await adminApi.hideVideo(v.id);
      // Đang lọc "Đang hiện" thì bỏ dòng đó đi, còn lại đổi nhãn thành Đã ẩn
      list.setItems((items) => filter === 'PUBLISHED' ? items.filter((x) => x.id !== v.id) : items.map((x) => (x.id === v.id ? updated : x)));
    } catch (e) {
      Alert.alert('Ẩn thất bại', getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <Header title="Kiểm duyệt video" count={list.loading ? undefined : list.totalElements} />
      <View style={styles.tools}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Tìm tiêu đề hoặc tác giả…"
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
          keyExtractor={(v) => String(v.id)}
          renderItem={({ item }) => (
            <Row
              v={item}
              busy={busyId === item.id}
              onOpen={() => item.status === 'PUBLISHED' && navigation.navigate('Watch', { videoId: item.id })}
              onOpenOwner={() => navigation.navigate('Profile', { userId: item.owner.id })}
              onHide={() => hide(item)}
            />
          )}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={list.items.length === 0 ? styles.empty : styles.listContent}
          ListEmptyComponent={
            list.error ? <ErrorView message={list.error} onRetry={list.reload} />
              : <EmptyView icon="videocam-outline" title="Không có video nào" message={keyword ? 'Thử từ khoá khác' : undefined} />
          }
        />
      )}
    </Screen>
  );
}

function Row({ v, busy, onOpen, onOpenOwner, onHide }: { v: Video; busy: boolean; onOpen: () => void; onOpenOwner: () => void; onHide: () => void }) {
  const hidden = v.status === 'HIDDEN';
  return (
    <View style={styles.row}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Xem video ${v.title}`}>
        {v.thumbnailUrl ? (
          <Image source={{ uri: mediaUrl(v.thumbnailUrl) }} style={[styles.thumb, hidden && styles.dim]} />
        ) : (
          <View style={[styles.thumb, styles.noThumb]}><Ionicons name="videocam" size={20} color={colors.muted} /></View>
        )}
      </Pressable>
      <View style={styles.flex}>
        <AppText weight="semibold" numberOfLines={2}>{v.title}</AppText>
        <Pressable onPress={onOpenOwner} hitSlop={4}>
          <AppText size={13} color={colors.primaryText} numberOfLines={1}>@{v.owner.username}</AppText>
        </Pressable>
        <AppText size={12} color={colors.muted}>{formatCount(v.viewCount)} lượt xem · {timeAgo(v.createdAt)}</AppText>
        <View style={[styles.badge, hidden ? styles.badgeHidden : styles.badgeOk]}>
          <AppText size={11} weight="semibold" color={hidden ? colors.danger : '#047857'}>{hidden ? 'Đã ẩn' : 'Đang hiện'}</AppText>
        </View>
      </View>
      {!hidden && <Button title="Ẩn" size="sm" variant="danger" icon="eye-off-outline" loading={busy} onPress={onHide} />}
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
  thumb: { width: 56, height: 76, borderRadius: radius.sm, backgroundColor: colors.surface },
  noThumb: { alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.4 },
  flex: { flex: 1, gap: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, marginTop: 2 },
  badgeOk: { backgroundColor: '#D1FAE5' },
  badgeHidden: { backgroundColor: '#FEE2E2' },
});
