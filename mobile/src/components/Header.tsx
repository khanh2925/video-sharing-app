/**
 * Thanh tiêu đề có nút quay lại.
 *   <Header title="Video nháp" count={3} />
 *   <Header title="Sửa hồ sơ" right={<Button title="Lưu" size="sm" />} />
 *   <Header title="Bạn bè" showBack={false} />   → màn trong tab, không có nút lùi
 */
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../constants/theme';
import { AppText } from './AppText';

interface Props {
  title: string;
  count?: number;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}

export function Header({ title, count, showBack = true, onBack, right }: Props) {
  const navigation = useNavigation();
  return (
    <View style={styles.bar}>
      {showBack && (
        <Pressable
          onPress={onBack ?? (() => navigation.goBack())}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      )}
      <AppText weight="bold" size={18} numberOfLines={1} style={[styles.title, !showBack && { marginLeft: spacing.sm }]}>
        {title}
      </AppText>
      {count !== undefined && (
        <View style={styles.count}>
          <AppText weight="semibold" size={13} color={colors.muted}>{count}</AppText>
        </View>
      )}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 56, gap: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flexShrink: 1 },
  count: { marginLeft: 6, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  right: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
});
