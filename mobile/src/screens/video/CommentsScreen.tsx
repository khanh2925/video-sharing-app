/**
 * Bình luận — UC11
 * Phụ trách: Thanh
 *
 * Màn dạng modal trong suốt (transparentModal, khai báo ở RootNavigator):
 * - Phần trên tối mờ, vẫn thấy video phía sau; bấm vào thì đóng.
 * - Bảng trắng chiếm ~70% màn: danh sách bình luận (có phân trang) + ô viết bình luận.
 * - Viết / thích bình luận cần đăng nhập (requireAuth). Bình luận của mình có nút "Xoá" (hỏi xác nhận).
 */
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Avatar, EmptyView, ErrorView, Loading } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { videoApi } from '../../api/videos';
import { getErrorMessage } from '../../api/client';
import { usePagedList } from '../../hooks/usePagedList';
import { formatCount, timeAgo } from '../../utils/format';
import type { Comment } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

const MAX_LENGTH = 500;

export default function CommentsScreen({ navigation, route }: RootScreenProps<'Comments'>) {
  const { videoId } = route.params;
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const insets = useSafeAreaInsets();

  const list = usePagedList((page) => videoApi.comments(videoId, page), [videoId]);
  // Tổng số bình luận = số backend trả + số mình vừa thêm/xoá ở màn này
  const [delta, setDelta] = useState(0);
  const total = list.totalElements + delta;

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  /** Sửa 1 bình luận trong danh sách */
  const patch = (id: number, change: Partial<Comment>) =>
    list.setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...change } : c)));

  // ----- Gửi bình luận -----
  const onSend = () =>
    requireAuth(async () => {
      const content = draft.trim();
      if (!content || sending) return;
      setSending(true);
      try {
        const created = await videoApi.addComment(videoId, content);
        list.setItems((prev) => [created, ...prev]); // bình luận mới lên đầu
        setDelta((d) => d + 1);
        setDraft('');
      } catch (e) {
        Alert.alert('Không gửi được', getErrorMessage(e));
      } finally {
        setSending(false);
      }
    });

  // ----- Thích bình luận (đổi giao diện trước, lỗi thì trả lại) -----
  const onLike = (c: Comment) =>
    requireAuth(async () => {
      patch(c.id, { liked: !c.liked, likeCount: c.likeCount + (c.liked ? -1 : 1) });
      try {
        await (c.liked ? videoApi.unlikeComment(c.id) : videoApi.likeComment(c.id));
      } catch (e) {
        patch(c.id, { liked: c.liked, likeCount: c.likeCount });
        Alert.alert('Lỗi', getErrorMessage(e));
      }
    });

  // ----- Xoá bình luận của mình (hỏi xác nhận) -----
  const onDelete = (c: Comment) =>
    Alert.alert('Xoá bình luận?', 'Không khôi phục được.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await videoApi.removeComment(c.id);
            list.setItems((prev) => prev.filter((x) => x.id !== c.id));
            setDelta((d) => d - 1);
            flash('Đã xoá bình luận');
          } catch (e) {
            Alert.alert('Không xoá được', getErrorMessage(e));
          }
        },
      },
    ]);

  const renderItem = ({ item }: { item: Comment }) => {
    const mine = user?.id === item.user.id;
    return (
      <View style={[styles.row, mine && styles.rowMine]}>
        <Avatar
          uri={item.user.avatarUrl}
          name={item.user.displayName}
          size={36}
          onPress={() => navigation.navigate('Profile', { userId: item.user.id })}
        />
        <View style={styles.rowBody}>
          <AppText weight="semibold" size={13}>{item.user.displayName}</AppText>
          <AppText size={14}>{item.content}</AppText>
          <View style={styles.metaRow}>
            <AppText size={12} color={colors.muted}>{timeAgo(item.createdAt)}</AppText>
            {mine && (
              <Pressable onPress={() => onDelete(item)} style={styles.deleteBtn} hitSlop={6}>
                <AppText weight="semibold" size={12} color={colors.danger}>Xoá</AppText>
              </Pressable>
            )}
          </View>
        </View>
        <Pressable
          style={styles.likeBtn}
          onPress={() => onLike(item)}
          accessibilityLabel={item.liked ? 'Bỏ thích bình luận' : 'Thích bình luận'}
        >
          <Ionicons
            name={item.liked ? 'heart' : 'heart-outline'}
            size={18}
            color={item.liked ? colors.primary : colors.muted}
          />
          <AppText size={11} color={item.liked ? colors.primaryText : colors.muted}>{formatCount(item.likeCount)}</AppText>
        </Pressable>
      </View>
    );
  };

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      {/* Vùng tối phía trên: bấm để đóng */}
      <Pressable style={styles.backdrop} onPress={navigation.goBack} accessibilityLabel="Đóng bình luận" />

      <View style={styles.panel}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <AppText weight="bold" size={17}>{formatCount(Math.max(0, total))} bình luận</AppText>
          <Pressable style={styles.closeBtn} onPress={navigation.goBack} accessibilityLabel="Đóng">
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <ErrorView message={list.error} onRetry={list.reload} />
        ) : (
          <FlatList
            data={list.items}
            keyExtractor={(c) => String(c.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onEndReached={list.loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
            ListEmptyComponent={<EmptyView icon="chatbubbles-outline" title="Chưa có bình luận" message="Hãy là người đầu tiên bình luận" />}
          />
        )}

        {/* Ô viết bình luận */}
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}>
          {user ? (
            <Avatar uri={user.avatarUrl} name={user.displayName} size={36} />
          ) : (
            <View style={styles.guestAvatar}>
              <Ionicons name="person" size={18} color={colors.primaryText} />
            </View>
          )}
          {user ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Viết bình luận…"
              placeholderTextColor={colors.placeholder}
              accessibilityLabel="Viết bình luận"
              maxLength={MAX_LENGTH}
              returnKeyType="send"
              onSubmitEditing={onSend}
              style={styles.input}
            />
          ) : (
            // Khách: bấm vào ô thì hiện bảng đăng nhập
            <Pressable style={[styles.input, styles.inputGuest]} onPress={() => requireAuth()}>
              <AppText size={14} color={colors.placeholder}>Viết bình luận…</AppText>
            </Pressable>
          )}
          <Pressable
            style={[styles.sendBtn, { opacity: canSend ? 1 : 0.45 }]}
            onPress={onSend}
            disabled={!canSend}
            accessibilityLabel="Gửi"
          >
            {sending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}
          </Pressable>
        </View>

        {!!toast && (
          <View style={styles.toast} pointerEvents="none">
            <AppText size={14} color={colors.white} align="center">{toast}</AppText>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 3, backgroundColor: colors.overlay },
  panel: { flex: 7, backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -radius.xl },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: spacing.xl, paddingRight: spacing.md, paddingVertical: spacing.sm },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: 6, flexGrow: 1 },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  rowMine: { backgroundColor: colors.primarySoft },
  rowBody: { flex: 1, gap: 3, minWidth: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  deleteBtn: { height: 28, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  likeBtn: { width: 44, height: 44, alignItems: 'center', gap: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: spacing.md, paddingHorizontal: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background,
  },
  guestAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, minWidth: 0, height: 44, borderRadius: radius.xl, backgroundColor: colors.surface, paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular, fontSize: 14, color: colors.text,
  },
  inputGuest: { justifyContent: 'center' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: spacing.xl, right: spacing.xl, bottom: 100, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.text },
});
