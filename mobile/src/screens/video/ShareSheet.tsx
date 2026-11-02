/**
 * Bảng "Chia sẻ" ở màn Xem video (UC20): chọn bạn bè rồi gửi, mỗi người nhận một thông báo.
 *
 * - Danh sách = những người mình đang theo dõi (GET /api/users/{me}/following), có ô lọc theo tên.
 * - Chọn tối đa 20 người, lời nhắn không bắt buộc (≤ 150 ký tự), bấm "Gửi" → POST /api/videos/{id}/share.
 * - Người không xem được video (vd video "Người theo dõi" mà họ chưa theo dõi) thì backend bỏ qua.
 * - "Sao chép liên kết", "Facebook"... ngoài MVP → báo phiên bản sau (R16).
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Avatar, BottomSheet, Button } from '../../components';
import { userApi } from '../../api/catalog';
import { notificationApi } from '../../api/notifications';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import type { FollowUser } from '../../types/models';

const MAX_RECIPIENTS = 20;
const MESSAGE_MAX = 150;

const soon = () => Alert.alert('Thông báo', 'Tính năng sẽ có ở phiên bản sau');

export function ShareSheet({ visible, videoId, onClose }: { visible: boolean; videoId: number; onClose: () => void }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FollowUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Mỗi lần mở bảng: xoá lựa chọn cũ, tải lại danh sách bạn bè
  useEffect(() => {
    if (!visible || !user) return;
    let alive = true;
    /* eslint-disable react-hooks/set-state-in-effect -- Đặt lại bảng mỗi lần mở. */
    setPicked([]);
    setMessage('');
    setFilter('');
    setLoadError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    userApi.following(user.id, 0, 50)
      .then((p) => alive && setFriends(p.content))
      .catch((e) => alive && setLoadError(getErrorMessage(e)));
    return () => { alive = false; };
  }, [visible, user]);

  const shown = useMemo(() => {
    const k = filter.trim().toLowerCase();
    if (!friends) return [];
    if (!k) return friends;
    return friends.filter((f) => `${f.displayName} ${f.username}`.toLowerCase().includes(k));
  }, [friends, filter]);

  const toggle = (id: number) =>
    setPicked((list) => {
      if (list.includes(id)) return list.filter((x) => x !== id);
      if (list.length >= MAX_RECIPIENTS) {
        Alert.alert('Thông báo', `Mỗi lần chia sẻ tối đa ${MAX_RECIPIENTS} người`);
        return list;
      }
      return [...list, id];
    });

  const send = async () => {
    if (picked.length === 0 || sending) return;
    setSending(true);
    try {
      const sent = await notificationApi.share(videoId, picked, message.trim() || undefined);
      onClose();
      Alert.alert('Đã chia sẻ', sent < picked.length
        ? `Đã gửi cho ${sent}/${picked.length} người. Những người còn lại không xem được video này.`
        : `Đã gửi cho ${sent} người`);
    } catch (e) {
      Alert.alert('Chia sẻ thất bại', getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Chia sẻ" heightPercent={75}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={colors.muted} />
        <TextInput
          value={filter}
          onChangeText={setFilter}
          placeholder="Tìm bạn bè…"
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          autoCapitalize="none"
        />
      </View>

      {friends === null && !loadError ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(f) => String(f.id)}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const on = picked.includes(item.id);
            return (
              <Pressable
                onPress={() => toggle(item.id)}
                style={styles.row}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={item.displayName}
              >
                <Avatar uri={item.avatarUrl} name={item.displayName} size={40} />
                <View style={styles.flex}>
                  <AppText weight="semibold" numberOfLines={1}>{item.displayName}</AppText>
                  <AppText size={12} color={colors.muted} numberOfLines={1}>
                    @{item.username}{item.followsMe ? ' · Bạn bè' : ''}
                  </AppText>
                </View>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? colors.primary : colors.placeholder} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <AppText color={colors.muted} style={styles.empty}>
              {loadError ?? (friends?.length ? 'Không có ai khớp' : 'Bạn chưa theo dõi ai. Theo dõi bạn bè để chia sẻ video cho họ.')}
            </AppText>
          }
        />
      )}

      <View style={styles.others}>
        {([['link-outline', 'Sao chép liên kết'], ['logo-facebook', 'Facebook'], ['logo-instagram', 'Instagram']] as const).map(([icon, label]) => (
          <Pressable key={label} onPress={soon} style={styles.other} accessibilityRole="button" accessibilityLabel={label}>
            <View style={styles.otherIcon}><Ionicons name={icon} size={20} color={colors.text} /></View>
            <AppText size={11} color={colors.muted}>{label}</AppText>
          </Pressable>
        ))}
      </View>

      {picked.length > 0 && (
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Viết lời nhắn (không bắt buộc)…"
          placeholderTextColor={colors.placeholder}
          maxLength={MESSAGE_MAX}
          style={[styles.searchBox, styles.input, styles.message]}
        />
      )}
      <Button
        title={picked.length > 0 ? `Gửi (${picked.length})` : 'Gửi'}
        icon="paper-plane"
        onPress={send}
        loading={sending}
        disabled={picked.length === 0}
        style={styles.sendBtn}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 42, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  message: { flex: 0, marginTop: spacing.sm },
  loading: { marginTop: spacing.xl },
  list: { flex: 1, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  empty: { textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  others: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  other: { alignItems: 'center', gap: 4 },
  otherIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { marginTop: spacing.sm, marginBottom: spacing.lg },
});
