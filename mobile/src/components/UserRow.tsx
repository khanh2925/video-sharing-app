/**
 * Một dòng người dùng: avatar + tên + dòng phụ + nút bên phải (Theo dõi / Bạn bè...).
 *   <UserRow user={u} subtitle={`@${u.username}`} onPress={() => navigation.navigate('Profile', { userId: u.id })}
 *            right={<Button title="Theo dõi" size="sm" onPress={...} />} />
 */
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import type { UserSummary } from '../types/models';
import { AppText } from './AppText';
import { Avatar } from './Avatar';

interface Props {
  user: UserSummary;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  avatarSize?: number;
}

export function UserRow({ user, subtitle, right, onPress, avatarSize = 52 }: Props) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.main} onPress={onPress} disabled={!onPress}>
        <Avatar uri={user.avatarUrl} name={user.displayName} size={avatarSize} />
        <View style={styles.texts}>
          <AppText weight="semibold" numberOfLines={1}>{user.displayName}</AppText>
          <AppText size={12} color={colors.muted} numberOfLines={1}>{subtitle ?? `@${user.username}`}</AppText>
        </View>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  texts: { flex: 1, gap: 2 },
});
