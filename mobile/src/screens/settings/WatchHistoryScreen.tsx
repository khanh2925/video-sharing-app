/**
 * Lịch sử xem — mở từ Cài đặt (cũng có tab "Lịch sử" ở Hồ sơ của tôi).
 * Lưới video đã xem, mới xem nhất trước; nút "Xoá" ở góc phải xoá toàn bộ lịch sử (có hỏi xác nhận).
 */
import { Alert, Pressable, StyleSheet } from 'react-native';
import { AppText, EmptyView, ErrorView, Header, Loading, Screen, VideoGrid } from '../../components';
import { videoApi } from '../../api/videos';
import { getErrorMessage } from '../../api/client';
import { usePagedList } from '../../hooks/usePagedList';
import { colors } from '../../constants/theme';
import { confirmAsync } from '../../utils/confirm';
import type { RootScreenProps } from '../../navigation/types';

export default function WatchHistoryScreen({ navigation }: RootScreenProps<'WatchHistory'>) {
  const list = usePagedList((page, size) => videoApi.myHistory(page, size), [], 18);

  const clear = async () => {
    if (!(await confirmAsync('Xoá lịch sử xem?', 'Không khôi phục được.', 'Xoá'))) return;
    try {
      await videoApi.clearHistory();
      list.setItems([]);
    } catch (e) {
      Alert.alert('Xoá thất bại', getErrorMessage(e));
    }
  };

  return (
    <Screen>
      <Header
        title="Lịch sử xem"
        right={list.items.length > 0 ? (
          <Pressable onPress={clear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Xoá lịch sử xem">
            <AppText weight="semibold" color={colors.danger}>Xoá</AppText>
          </Pressable>
        ) : undefined}
      />
      {list.loading ? (
        <Loading />
      ) : (
        <VideoGrid
          data={list.items}
          onPressItem={(v) => navigation.navigate('Watch', { videoId: v.id, source: { kind: 'history' } })}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flexGrow: 1 },
});
