/**
 * Bảng điều khiển quản trị — chỉ tài khoản ADMIN (vào từ menu ☰ ở Hồ sơ của tôi).
 * - 4 ô số liệu (GET /api/admin/stats): người dùng, bị khoá, video đã đăng, video đã ẩn. Bấm ô → mở đúng danh sách.
 * - 3 mục: Kiểm duyệt video (UC15), Quản lý người dùng (UC16), Cấu hình hệ thống (UC19).
 * - Quay lại màn này thì tải lại số liệu.
 */
import { useCallback, useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, ErrorView, Header, Screen } from '../../components';
import { adminApi } from '../../api/admin';
import { useFetch } from '../../hooks/useFetch';
import { colors, radius, spacing } from '../../constants/theme';
import { formatCount } from '../../utils/format';
import type { RootScreenProps } from '../../navigation/types';

type IconName = keyof typeof Ionicons.glyphMap;

export default function AdminDashboardScreen({ navigation }: RootScreenProps<'AdminDashboard'>) {
  const stats = useFetch(() => adminApi.stats(), []);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      stats.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const s = stats.data;
  const n = (v: number | undefined) => (v == null ? '–' : formatCount(v));

  return (
    <Screen>
      <Header title="Quản trị" />
      {stats.error && !s ? (
        <ErrorView message={stats.error} onRetry={stats.reload} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={stats.loading && !!s} onRefresh={stats.reload} tintColor={colors.primary} />}
        >
          <View style={styles.grid}>
            <StatCard icon="people" color="#3B82F6" label="Người dùng" value={n(s?.totalUsers)}
              onPress={() => navigation.navigate('AdminUsers', { status: 'ALL' })} />
            <StatCard icon="lock-closed" color={colors.danger} label="Bị khoá" value={n(s?.lockedUsers)}
              onPress={() => navigation.navigate('AdminUsers', { status: 'LOCKED' })} />
            <StatCard icon="videocam" color="#10B981" label="Video đã đăng" value={n(s?.publishedVideos)}
              onPress={() => navigation.navigate('AdminVideos', { status: 'PUBLISHED' })} />
            <StatCard icon="eye-off" color="#F59E0B" label="Video đã ẩn" value={n(s?.hiddenVideos)}
              onPress={() => navigation.navigate('AdminVideos', { status: 'HIDDEN' })} />
          </View>

          <AppText size={13} weight="semibold" color={colors.muted} style={styles.section}>Chức năng</AppText>
          <View style={styles.card}>
            <MenuRow icon="shield-checkmark-outline" title="Kiểm duyệt video" sub="Xem và ẩn video vi phạm"
              onPress={() => navigation.navigate('AdminVideos')} />
            <MenuRow icon="people-outline" title="Quản lý người dùng" sub="Khoá / mở khoá tài khoản"
              onPress={() => navigation.navigate('AdminUsers')} />
            <MenuRow icon="options-outline" title="Cấu hình hệ thống" sub="Dung lượng video, độ dài và thời gian tồn tại story"
              onPress={() => navigation.navigate('AdminSettings')} />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function StatCard({ icon, color, label, value, onPress }: { icon: IconName; color: string; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.stat} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color={colors.white} />
      </View>
      <AppText weight="bold" size={24}>{value}</AppText>
      <AppText size={13} color={colors.muted}>{label}</AppText>
    </Pressable>
  );
}

function MenuRow({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button" accessibilityLabel={title}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <View style={styles.flex}>
        <AppText weight="semibold">{title}</AppText>
        <AppText size={13} color={colors.muted}>{sub}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { width: '47%', flexGrow: 1, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  section: { marginTop: spacing.xxl, marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  flex: { flex: 1, gap: 2 },
});
