/**
 * 3 trạng thái hay gặp khi tải dữ liệu:
 *   if (loading) return <Loading />;
 *   if (error) return <ErrorView message={error} onRetry={reload} />;
 *   ListEmptyComponent={<EmptyView icon="videocam-outline" title="Chưa có video nháp" />}
 */
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export function Loading({ dark = false }: { dark?: boolean }) {
  return (
    <View style={[styles.center, dark && { backgroundColor: colors.black }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.muted} />
      <AppText align="center" color={colors.muted}>{message}</AppText>
      {onRetry && <Button title="Thử lại" variant="outline" size="sm" icon="refresh" onPress={onRetry} />}
    </View>
  );
}

interface EmptyProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}

export function EmptyView({ icon = 'file-tray-outline', title, message }: EmptyProps) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={44} color={colors.placeholder} />
      <AppText weight="semibold" align="center">{title}</AppText>
      {!!message && <AppText size={13} align="center" color={colors.muted}>{message}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, minHeight: 240 },
});
