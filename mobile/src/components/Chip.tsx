/**
 * Nhãn nhỏ: hashtag, chủ đề, nhãn "Sắp có".
 *   <Chip label="#dulich" tone="blue" onRemove={() => removeTag('dulich')} />
 *   <Chip label="Du lịch" selected={topicId === 1} onPress={() => setTopicId(1)} />
 *   <ComingSoonBadge />
 */
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  tone?: 'pink' | 'blue' | 'gray';
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

const tones = {
  pink: { bg: colors.primarySoft, fg: colors.primaryText },
  blue: { bg: colors.blueSoft, fg: colors.blueText },
  gray: { bg: colors.surface, fg: colors.muted },
};

export function Chip({ label, tone = 'gray', selected, onPress, onRemove }: Props) {
  const t = selected ? { bg: colors.primary, fg: colors.white } : tones[tone];
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.chip, { backgroundColor: t.bg }]}>
      <AppText weight="medium" size={13} color={t.fg}>{label}</AppText>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Bỏ ${label}`}>
          <Ionicons name="close" size={14} color={t.fg} />
        </Pressable>
      )}
    </Pressable>
  );
}

export function ComingSoonBadge() {
  return <Chip label="Sắp có" tone="gray" />;
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 12, borderRadius: 15, alignSelf: 'flex-start' },
});
