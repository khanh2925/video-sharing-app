/**
 * Lịch sử xem — mở từ Cài đặt (cũng có tab "Lịch sử xem" ở Hồ sơ của tôi).
 * Lưới video đã xem, mới xem nhất trước.
 * - Nút "Chọn" ở góc phải → bấm vào video để tick, thanh dưới có "Xoá (n)" và "Xoá tất cả".
 * - Xoá nào cũng hỏi xác nhận.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, EmptyView, ErrorView, Header, Loading, Screen, VideoGrid } from '../../components';
import { videoApi } from '../../api/videos';
import { getErrorMessage } from '../../api/client';
import { usePagedList } from '../../hooks/usePagedList';
import { colors, spacing } from '../../constants/theme';
import { confirmAsync } from '../../utils/confirm';
import type { Video } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

export default function WatchHistoryScreen({ navigation }: RootScreenProps<'WatchHistory'>) {
  const list = usePagedList((page, size) => videoApi.myHistory(page, size), [], 18);
  // null = đang xem bình thường; Set = đang ở chế độ chọn
  const [selected, setSelected] = useState<Set<number> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggle = (v: Video) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(v.id)) next.delete(v.id);
      else next.add(v.id);
      return next;
    });
  };

  const removeSelected = async () => {
    if (!selected || selected.size === 0) return;
    if (!(await confirmAsync(`Xoá ${selected.size} video khỏi lịch sử?`, 'Không khôi phục được.', 'Xoá'))) return;
    setDeleting(true);
    try {
      await videoApi.removeFromHistory([...selected]);
      list.setItems((items) => items.filter((v) => !selected.has(v.id)));
      setSelected(null);
      list.refresh(); // các trang sau bị dồn lên, tải lại cho khỏi sót video
    } catch (e) {
      Alert.alert('Xoá thất bại', getErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const clearAll = async () => {
    if (!(await confirmAsync('Xoá toàn bộ lịch sử xem?', 'Không khôi phục được.', 'Xoá tất cả'))) return;
    setDeleting(true);
    try {
      await videoApi.clearHistory();
      list.setItems([]);
      setSelected(null);
    } catch (e) {
      Alert.alert('Xoá thất bại', getErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const selecting = selected !== null;

  return (
    <Screen>
      <Header
        title="Lịch sử xem"
        right={list.items.length > 0 ? (
          <Pressable
            onPress={() => setSelected(selecting ? null : new Set())}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={selecting ? 'Huỷ chọn' : 'Chọn video để xoá'}
          >
            <AppText weight="semibold" color={colors.primary}>{selecting ? 'Huỷ' : 'Chọn'}</AppText>
          </Pressable>
        ) : undefined}
      />
      {list.loading ? (
        <Loading />
      ) : (
        <VideoGrid
          data={list.items}
          selectedIds={selected ?? undefined}
          onPressItem={(v) =>
            selecting ? toggle(v) : navigation.navigate('Watch', { videoId: v.id, source: { kind: 'history' } })
          }
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          onEndReached={list.loadMore}
          contentContainerStyle={list.items.length === 0 ? styles.empty : undefined}
          ListEmptyComponent={
            list.error ? (
              <ErrorView message={list.error} onRetry={list.reload} />
            ) : (
              <EmptyView icon="time-outline" title="Chưa xem video nào" message="Video bạn đã xem sẽ hiện ở đây." />
            )
          }
        />
      )}
      {selecting && (
        <View style={styles.actions}>
          <Button title="Xoá tất cả" variant="secondary" onPress={clearAll} disabled={deleting} style={styles.action} />
          <Button
            title={`Xoá (${selected.size})`}
            onPress={removeSelected}
            disabled={selected.size === 0 || deleting}
            loading={deleting}
            style={styles.action}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flexGrow: 1 },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  action: { flex: 1 },
});
