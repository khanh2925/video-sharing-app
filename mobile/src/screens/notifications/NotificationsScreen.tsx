/**
 * Thông báo — UC20. Mở từ nút chuông ở Trang chủ (cần đăng nhập).
 *
 * - 4 loại: thích video, bình luận video của mình, theo dõi mình, chia sẻ video cho mình.
 * - Mới nhất trước, kéo xuống làm mới, cuộn tới cuối tải thêm (usePagedList).
 * - Dòng chưa đọc có nền hồng nhạt. Mở màn xong thì đánh dấu đã đọc hết (chấm đỏ ở chuông biến mất),
 *   nhưng dòng vẫn giữ nền hồng tới lần mở sau để người dùng biết cái nào mới.
 * - Bấm dòng: có video → Xem video; theo dõi → hồ sơ người đó. Bấm avatar → hồ sơ người đó.
 */
import { useEffect } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Avatar, EmptyView, ErrorView, Header, Loading, Screen } from '../../components';
import { notificationApi } from '../../api/notifications';
import { usePagedList } from '../../hooks/usePagedList';
import { NOTIFICATION_ACTION, useNotifications } from '../../context/NotificationContext';
import { colors, radius, spacing } from '../../constants/theme';
import { timeAgo } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { AppNotification, NotificationType } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

const ACTION = NOTIFICATION_ACTION;

const ICON: Record<NotificationType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  LIKE: { name: 'heart', color: colors.primary },
  COMMENT: { name: 'chatbubble-ellipses', color: '#3B82F6' },
  FOLLOW: { name: 'person-add', color: '#10B981' },
  SHARE: { name: 'paper-plane', color: '#F59E0B' },
};

export default function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  const list = usePagedList((page, size) => notificationApi.list(page, size), [], 20);
  const { markAllRead } = useNotifications();

  // Tải xong trang đầu thì đánh dấu đã đọc hết (lỗi thì thôi, lần sau mở lại)
  const firstLoaded = !list.loading && !list.error;
  useEffect(() => {
    if (!firstLoaded) return;
    markAllRead();   // số trên chuông về 0 ngay
    notificationApi.readAll().catch(() => {});
  }, [firstLoaded, markAllRead]);

  const open = (n: AppNotification) => {
    if (n.videoId) navigation.navigate('Watch', { videoId: n.videoId });
    else navigation.navigate('Profile', { userId: n.actor.id });
  };

  if (list.loading) return <Loading />;

  return (
    <Screen>
      <Header title="Thông báo" />
      <FlatList
        data={list.items}
        keyExtractor={(n) => String(n.id)}
        renderItem={({ item }) => (
          <Row n={item} onPress={() => open(item)} onPressActor={() => navigation.navigate('Profile', { userId: item.actor.id })} />
        )}
        refreshing={list.refreshing}
        onRefresh={list.refresh}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={list.items.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={
          list.error ? (
            <ErrorView message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyView icon="notifications-outline" title="Chưa có thông báo" message="Khi có người thích, bình luận, theo dõi hay chia sẻ video với bạn, thông báo sẽ hiện ở đây" />
          )
        }
      />
    </Screen>
  );
}

function Row({ n, onPress, onPressActor }: { n: AppNotification; onPress: () => void; onPressActor: () => void }) {
  const icon = ICON[n.type];
  const name = n.actor.displayName || n.actor.username;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !n.read && styles.unread]}
      accessibilityRole="button"
      accessibilityLabel={`${name} ${ACTION[n.type]}`}
    >
      <View>
        <Avatar uri={n.actor.avatarUrl} name={name} size={48} onPress={onPressActor} accessibilityLabel={`Hồ sơ của ${name}`} />
        <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={11} color={colors.white} />
        </View>
      </View>
      <View style={styles.body}>
        <AppText size={14} numberOfLines={2}>
          <AppText weight="semibold" size={14}>{name}</AppText> {ACTION[n.type]}
        </AppText>
        {n.text ? (
          <AppText size={13} color={colors.muted} numberOfLines={2} style={styles.quote}>“{n.text}”</AppText>
        ) : null}
        <AppText size={12} color={colors.muted}>{timeAgo(n.createdAt)}</AppText>
      </View>
      {n.videoId ? (
        n.videoThumbnailUrl ? (
          <Image source={{ uri: mediaUrl(n.videoThumbnailUrl) }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.noThumb]}>
            <Ionicons name="videocam" size={18} color={colors.muted} />
          </View>
        )
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  unread: { backgroundColor: '#FFF6F9' },   // hồng rất nhạt, khác nền avatar chữ (primarySoft)
  typeBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  quote: { fontStyle: 'italic' },
  thumb: { width: 44, height: 58, borderRadius: radius.sm, backgroundColor: colors.surface },
  noThumb: { alignItems: 'center', justifyContent: 'center' },
});
