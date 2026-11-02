/**
 * Cài đặt — mở từ menu ☰ ở Hồ sơ của tôi.
 * Gom các mục: Tài khoản (Sửa hồ sơ, Lịch sử xem, Video nháp), Thông báo, mục ngoài MVP (báo phiên bản sau, R16),
 * thông tin ứng dụng và Đăng xuất (hỏi xác nhận, chạy được cả bản web).
 */
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Header, Screen } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../constants/theme';
import { confirmAsync } from '../../utils/confirm';
import type { RootScreenProps } from '../../navigation/types';

const soon = () => Alert.alert('Thông báo', 'Tính năng sẽ có ở phiên bản sau');

type IconName = keyof typeof Ionicons.glyphMap;

export default function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  const { user, logout } = useAuth();

  const onLogout = async () => {
    if (!(await confirmAsync('Đăng xuất?', undefined, 'Đăng xuất'))) return;
    await logout();
    navigation.popTo('MainTabs', { screen: 'Home' });
  };

  return (
    <Screen>
      <Header title="Cài đặt" />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Tài khoản">
          <Row icon="person-outline" label="Sửa hồ sơ" onPress={() => navigation.navigate('EditProfile')} />
          <Row icon="time-outline" label="Lịch sử xem" onPress={() => navigation.navigate('WatchHistory')} />
          <Row icon="document-outline" label="Video nháp" onPress={() => navigation.navigate('Drafts')} />
          <Row icon="lock-closed-outline" label="Đổi mật khẩu" onPress={soon} />
        </Section>

        <Section title="Thông báo và quyền riêng tư">
          <Row icon="notifications-outline" label="Thông báo" onPress={() => navigation.navigate('Notifications')} />
          <Row icon="shield-checkmark-outline" label="Quyền riêng tư" onPress={soon} />
          <Row icon="ban-outline" label="Tài khoản đã chặn" onPress={soon} />
        </Section>

        <Section title="Ứng dụng">
          <Row icon="language-outline" label="Ngôn ngữ" value="Tiếng Việt" onPress={soon} />
          <Row icon="moon-outline" label="Giao diện tối" onPress={soon} />
          <Row icon="information-circle-outline" label="Phiên bản" value="1.0.0" />
        </Section>

        <Section>
          <Row icon="log-out-outline" label="Đăng xuất" danger onPress={onLogout} />
        </Section>

        {!!user && (
          <AppText size={12} color={colors.muted} align="center" style={styles.footer}>
            Đang đăng nhập: @{user.username}
          </AppText>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {!!title && <AppText size={13} weight="semibold" color={colors.muted} style={styles.sectionTitle}>{title}</AppText>}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ icon, label, value, danger, onPress }: { icon: IconName; label: string; value?: string; danger?: boolean; onPress?: () => void }) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={color} />
      <AppText weight="medium" color={color} style={styles.flex}>{label}</AppText>
      {!!value && <AppText size={14} color={colors.muted}>{value}</AppText>}
      {onPress && !danger && <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 40 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 },
  flex: { flex: 1 },
  footer: { marginTop: spacing.sm },
});
