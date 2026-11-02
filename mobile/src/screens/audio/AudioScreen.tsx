/**
 * Âm thanh — bấm một bài nhạc (Tìm kiếm, Trang chủ, Xem video) thì mở màn này, giống TikTok.
 *
 * - Đầu màn: ảnh bìa, tên bài, ca sĩ, thời lượng, số video đang dùng; chạm ảnh bìa để nghe thử.
 * - Nút "Dùng âm thanh này": mở Camera, gắn sẵn bài nhạc (khách → bảng đăng nhập).
 * - Lưới video công khai đang dùng bài này (GET /api/audios/{id}/videos), nhiều lượt xem trước.
 *   Bấm một video → màn Xem video, vuốt tiếp trong đúng danh sách này (source: audio).
 */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, EmptyView, ErrorView, Header, Loading, Screen, VideoGrid } from '../../components';
import { catalogApi } from '../../api/catalog';
import { useFetch } from '../../hooks/useFetch';
import { usePagedList } from '../../hooks/usePagedList';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { colors, radius, spacing } from '../../constants/theme';
import { formatCount, formatDuration } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { RootScreenProps } from '../../navigation/types';

export default function AudioScreen({ navigation, route }: RootScreenProps<'Audio'>) {
  const { audioId } = route.params;
  const requireAuth = useRequireAuth();
  const isFocused = useIsFocused();
  const audio = useFetch(() => catalogApi.audio(audioId), [audioId]);
  const list = usePagedList((page, size) => catalogApi.audioVideos(audioId, page, size), [audioId], 18);

  // Nghe thử: chạm ảnh bìa để phát / dừng, rời màn thì tự dừng
  const [previewing, setPreviewing] = useState(false);
  useBackgroundMusic(audio.data?.fileUrl, previewing && isFocused);

  if (audio.loading) return <Loading />;
  if (audio.error || !audio.data) return <ErrorView message={audio.error ?? 'Không tìm thấy bài nhạc'} onRetry={audio.reload} />;
  const a = audio.data;

  const onUseAudio = () =>
    requireAuth(() => {
      setPreviewing(false);
      navigation.navigate('Camera', { audio: a });
    });

  const header = (
    <View style={styles.head}>
      <View style={styles.row}>
        <Pressable
          onPress={() => setPreviewing((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={previewing ? 'Dừng nghe thử' : 'Nghe thử'}
        >
          {a.coverUrl ? (
            <Image source={{ uri: mediaUrl(a.coverUrl) }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.noCover]}>
              <Ionicons name="musical-notes" size={36} color={colors.primary} />
            </View>
          )}
          <View style={styles.playBadge}>
            <Ionicons name={previewing ? 'pause' : 'play'} size={18} color={colors.white} />
          </View>
        </Pressable>
        <View style={styles.info}>
          <AppText weight="bold" size={20} numberOfLines={2}>{a.title}</AppText>
          <AppText color={colors.muted} numberOfLines={1}>{a.artist}</AppText>
          <AppText size={13} color={colors.muted} style={styles.meta}>
            {formatDuration(a.durationSec)} · {formatCount(list.totalElements)} video
          </AppText>
        </View>
      </View>
      <Button title="Dùng âm thanh này" icon="videocam" onPress={onUseAudio} style={styles.useBtn} />
      <AppText weight="semibold" style={styles.gridTitle}>Video dùng âm thanh này</AppText>
    </View>
  );

  return (
    <Screen>
      <Header title="Âm thanh" />
      <VideoGrid
        data={list.items}
        ListHeaderComponent={header}
        onPressItem={(v) => navigation.navigate('Watch', { videoId: v.id, source: { kind: 'audio', audioId } })}
        refreshing={list.refreshing}
        onRefresh={list.refresh}
        onEndReached={list.loadMore}
        ListEmptyComponent={
          list.loading ? undefined : list.error ? (
            <ErrorView message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyView icon="musical-notes-outline" title="Chưa có video nào" message="Hãy là người đầu tiên dùng âm thanh này" />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { padding: spacing.xl, paddingBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  cover: { width: 104, height: 104, borderRadius: radius.md },
  noCover: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  playBadge: {
    position: 'absolute', right: 6, bottom: 6, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  meta: { marginTop: spacing.xs },
  useBtn: { marginTop: spacing.lg },
  gridTitle: { marginTop: spacing.xl },
});
