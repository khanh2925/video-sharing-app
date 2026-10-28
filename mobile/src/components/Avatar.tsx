/**
 * Ảnh đại diện tròn. Không có ảnh thì hiện chữ cái đầu của tên ("Quốc Khánh" → "QK").
 *   <Avatar uri={user.avatarUrl} name={user.displayName} size={52} />
 *   <Avatar ... ring="unseen" />  → vòng xanh (story chưa xem)
 *   <Avatar ... ring="seen" />    → vòng xám (đã xem hết)
 *   <Avatar ... onPress={...} accessibilityLabel="Hồ sơ Quốc Khánh" />  → bấm được thì nên có nhãn cho trình đọc màn hình
 * uri là đường dẫn backend trả về ("/files/..."), component tự ghép địa chỉ máy chủ.
 */
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { mediaUrl } from '../utils/media';
import { AppText } from './AppText';

interface Props {
  uri?: string | null;
  name?: string;
  size?: number;
  ring?: 'none' | 'unseen' | 'seen';
  onPress?: () => void;
  /** Nhãn đọc cho trình đọc màn hình khi avatar bấm được */
  accessibilityLabel?: string;
}

/** "Quốc Khánh" → "QK", "lan" → "L": chữ đầu của từ đầu và từ cuối */
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

export function Avatar({ uri, name = '?', size = 44, ring = 'none', onPress, accessibilityLabel }: Props) {
  const url = mediaUrl(uri);
  const ringWidth = ring === 'none' ? 0 : 3;
  const inner = size - ringWidth * 2 - (ring === 'none' ? 0 : 4);

  const content = url ? (
    <Image source={{ uri: url }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
  ) : (
    <View style={[styles.fallback, { width: inner, height: inner, borderRadius: inner / 2 }]}>
      <AppText weight="bold" size={inner * 0.36} color={colors.primaryText}>
        {initials(name)}
      </AppText>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? (accessibilityLabel ?? name) : accessibilityLabel}
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        ring !== 'none' && { borderWidth: ringWidth, borderColor: ring === 'unseen' ? colors.blue : colors.border },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  fallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
