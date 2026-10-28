/**
 * Nút bấm theo prototype.
 *   <Button title="Đăng nhập" onPress={onSubmit} loading={submitting} />
 *   <Button title="Lưu nháp" variant="outline" icon="download-outline" />
 *   <Button title="Sửa" variant="secondary" size="sm" />
 * variant: primary (hồng đặc) | outline (viền hồng) | secondary (nền xám) | danger (chữ đỏ)
 */
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'outline' | 'secondary' | 'danger';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variantStyle: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  outline: { bg: colors.white, fg: colors.primaryText, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.text },
  danger: { bg: colors.surface, fg: colors.danger },
};

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading, disabled, style }: Props) {
  const v = variantStyle[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: v.bg, borderColor: v.border ?? v.bg, opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} />}
          <AppText weight="semibold" size={size === 'sm' ? 13 : 16} color={v.fg}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  md: { height: 52, borderRadius: radius.lg },
  sm: { height: 36, borderRadius: 10, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
