/**
 * Video nháp — UC10
 * Phụ trách: Khánh
 *
 * Danh sách nháp có phân trang (GET /api/videos/me/drafts).
 * Mỗi bản nháp: Đăng ngay (PUT {publish: true}), Sửa (→ EditVideo), Xoá (hỏi xác nhận).
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, EmptyView, ErrorView, Header, Loading, Screen } from '../../components';
import { videoApi } from '../../api/videos';
import { getErrorMessage } from '../../api/client';
import { usePagedList } from '../../hooks/usePagedList';
import { colors, radius, spacing } from '../../constants/theme';
import { timeAgo, visibilityLabel } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { Video } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

export default function DraftsScreen({ navigation }: RootScreenProps<'Drafts'>) {
  const list = usePagedList((page, size) => videoApi.myDrafts(page, size), []);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Quay lại từ màn Sửa thì tải lại cho cập nhật (bỏ qua lần focus đầu tiên)
  const firstFocus = useRef(true);
  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      list.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Thông báo nhỏ ở đáy màn, tự tắt sau 2,2 giây
  const showToast = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  // Bỏ dòng khỏi danh sách ngay cho nhanh, rồi tải lại từ trang đầu:
  // xoá bớt thì các trang phía sau bị dồn lên, tải tiếp theo số trang cũ sẽ sót bản nháp
  const dropItem = (id: number) => {
    list.setItems((prev) => prev.filter((v) => v.id !== id));
    list.refresh();
  };

  const confirmPublish = (video: Video) => {
    Alert.alert(`Đăng “${video.title}”?`, `Ai được xem: ${visibilityLabel[video.visibility]}`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng',
        onPress: async () => {
          setBusyId(video.id);
          try {
            await videoApi.update(video.id, { publish: true });
            dropItem(video.id);
            showToast(`Đã đăng “${video.title}”`);
          } catch (e) {
            Alert.alert('Đăng thất bại', getErrorMessage(e));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const confirmDelete = (video: Video) => {
    Alert.alert('Xoá bản nháp?', 'Không khôi phục được.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          setBusyId(video.id);
          try {
            await videoApi.remove(video.id);
            dropItem(video.id);
            showToast('Đã xoá bản nháp');
          } catch (e) {
            Alert.alert('Xoá thất bại', getErrorMessage(e));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const renderBody = () => {
    if (list.loading) return <Loading />;
    if (list.error) return <ErrorView message={list.error} onRetry={list.reload} />;
    return (
      <FlatList
        data={list.items}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={list.items.length ? styles.list : styles.flexGrow}
        refreshing={list.refreshing}
        onRefresh={list.refresh}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyView icon="document-outline" title="Chưa có video nháp" />
            <Button title="Quay video" size="sm" onPress={() => navigation.navigate('Camera')} style={styles.emptyBtn} />
          </View>
        }
        renderItem={({ item }) => (
          <DraftRow
            video={item}
            busy={busyId === item.id}
            onPublish={() => confirmPublish(item)}
            onEdit={() => navigation.navigate('EditVideo', { videoId: item.id })}
            onDelete={() => confirmDelete(item)}
          />
        )}
      />
    );
  };

  return (
    <Screen>
      <Header title="Video nháp" count={list.loading ? undefined : list.totalElements} />
      {renderBody()}
      {toast && (
        <View style={styles.toast} accessibilityLiveRegion="polite" pointerEvents="none">
          <AppText size={14} color={colors.white} align="center">{toast}</AppText>
        </View>
      )}
    </Screen>
  );
}

/** 1 dòng bản nháp: ảnh bìa, tiêu đề, thông tin, 3 nút */
function DraftRow({
  video,
  busy,
  onPublish,
  onEdit,
  onDelete,
}: {
  video: Video;
  busy: boolean;
  onPublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const thumb = mediaUrl(video.thumbnailUrl);
  return (
    <View style={styles.row}>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Sửa ${video.title}`}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.noThumb]}>
            <Ionicons name="videocam-outline" size={26} color={colors.placeholder} />
          </View>
        )}
      </Pressable>
      <View style={styles.info}>
        <AppText weight="semibold" size={15} numberOfLines={1}>{video.title}</AppText>
        <AppText size={12} color={colors.muted}>
          {`${timeAgo(video.createdAt)} · Khi đăng: ${visibilityLabel[video.visibility]}`}
        </AppText>
        <View style={styles.buttons}>
          <Button title="Đăng ngay" size="sm" loading={busy} disabled={busy} onPress={onPublish} />
          <Pressable onPress={onEdit} disabled={busy} style={styles.editBtn} accessibilityRole="button">
            <AppText weight="semibold" size={13}>Sửa</AppText>
          </Pressable>
          <Pressable
            onPress={onDelete}
            disabled={busy}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel={`Xoá bản nháp ${video.title}`}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  flexGrow: { flexGrow: 1 },
  footer: { paddingVertical: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyBtn: { marginTop: -spacing.lg },
  row: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  thumb: { width: 76, height: 108, borderRadius: 10, backgroundColor: colors.surface },
  noThumb: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 6, minWidth: 0 },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: 'auto' },
  editBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 40,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.text,
  },
});
