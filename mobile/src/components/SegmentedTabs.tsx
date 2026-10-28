/**
 * Hàng tab chọn 1 trong nhiều mục.
 *   const [tab, setTab] = useState<'followers' | 'following'>('followers');
 *   <SegmentedTabs value={tab} onChange={setTab}
 *     tabs={[{ key: 'following', label: 'Đang theo dõi' }, { key: 'followers', label: 'Người theo dõi' }]} />
 * variant="underline": gạch chân (Bạn bè, Hồ sơ) | "segment": nền xám (Ai được xem) | "pill": viên thuốc (Bộ lọc, Nhạc)
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius } from '../constants/theme';
import { AppText } from './AppText';

interface Tab<K extends string> {
  key: K;
  label: string;
}

interface Props<K extends string> {
  tabs: Tab<K>[];
  value: K;
  onChange: (key: K) => void;
  variant?: 'underline' | 'segment' | 'pill';
}

export function SegmentedTabs<K extends string>({ tabs, value, onChange, variant = 'underline' }: Props<K>) {
  if (variant === 'pill') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {tabs.map((t) => {
          const active = t.key === value;
          return (
            <Pressable key={t.key} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: active }}
              style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}>
              <AppText weight={active ? 'semibold' : 'medium'} size={13} color={active ? colors.white : colors.text}>{t.label}</AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  const isSegment = variant === 'segment';
  return (
    <View style={isSegment ? styles.segmentWrap : styles.underlineWrap}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: active }}
            style={[styles.item, isSegment ? [styles.segment, active && styles.segmentActive] : [styles.underline, active && styles.underlineActive]]}>
            <AppText weight={active ? 'bold' : 'medium'} size={14} color={active ? colors.text : colors.muted}>{t.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  underlineWrap: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  underline: { height: 46, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  underlineActive: { borderBottomColor: colors.primary },
  segmentWrap: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, gap: 4 },
  segment: { height: 38, borderRadius: 9 },
  segmentActive: { backgroundColor: colors.white, shadowColor: '#17141C', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  pillRow: { gap: 8 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.primary },
  pillIdle: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
});
