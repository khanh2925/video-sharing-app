/**
 * Bộ lọc — UC09
 * Phụ trách: Khánh
 *
 * Mở dạng transparentModal phía trên Camera (hoặc PostVideo), nên phần trên vẫn thấy camera.
 * Bộ lọc chỉ là 1 cái tên lưu kèm video (backend tối đa 30 ký tự); xem trước bằng lớp màu mờ phủ lên,
 * không xử lý ảnh thật.
 * Trả kết quả về màn trước bằng popTo + merge: true (giống Lab 06 bài 1).
 * Lưu ý React Navigation 7: navigate() tới màn đã có trong stack sẽ MỞ THÊM bản mới, nên phải dùng popTo().
 */
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import type { RootScreenProps } from '../../navigation/types';

/** Danh sách bộ lọc. tint = màu phủ lên video để xem trước (đây là dữ liệu bộ lọc, không phải màu giao diện). */
export interface FilterItem {
  name: string;
  tint: string;
  trending?: boolean;
  saved?: boolean;
}

export const FILTERS: FilterItem[] = [
  { name: 'Film', tint: 'rgba(40,30,20,0.25)', saved: true },
  { name: 'Đen trắng', tint: 'rgba(120,120,120,0.55)' },
  { name: 'Tự nhiên', tint: 'rgba(255,255,255,0)', trending: true },
  { name: 'Nghệ thuật', tint: 'rgba(219,39,102,0.25)', trending: true },
  { name: 'Cổ điển', tint: 'rgba(160,110,40,0.3)', saved: true },
  { name: 'Mùa xuân', tint: 'rgba(120,200,90,0.22)', trending: true },
  { name: 'Baby', tint: 'rgba(255,200,220,0.3)' },
  { name: 'Tương phản', tint: 'rgba(0,0,0,0.3)' },
];

export function findFilter(name?: string | null): FilterItem | undefined {
  return FILTERS.find((f) => f.name === name);
}

/** Lớp màu phủ lên camera / video để xem trước bộ lọc. Đặt trong View cha có position relative. */
export function FilterOverlay({ name }: { name?: string | null }) {
  const filter = findFilter(name);
  if (!filter) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: filter.tint }]} />;
}

type TabKey = 'foryou' | 'trend' | 'saved';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'foryou', label: 'Dành cho bạn' },
  { key: 'trend', label: 'Thịnh hành' },
  { key: 'saved', label: 'Đã lưu' },
];

export default function FilterScreen({ navigation, route }: RootScreenProps<'Filter'>) {
  const insets = useSafeAreaInsets();
  // Bộ lọc đang chọn (chưa bấm Xong thì chưa gửi về)
  const [selected, setSelected] = useState<string | undefined>(route.params?.current);
  const [tab, setTab] = useState<TabKey>('foryou');

  const list = tab === 'trend' ? FILTERS.filter((f) => f.trending) : tab === 'saved' ? FILTERS.filter((f) => f.saved) : FILTERS;

  // Bấm "Xong": gửi bộ lọc về đúng màn đã mở Filter (Camera hoặc PostVideo)
  const apply = () => {
    const state = navigation.getState();
    const previous = state.routes[state.index - 1]?.name;
    if (previous === 'PostVideo') {
      navigation.popTo('PostVideo', { filter: selected }, { merge: true });
    } else {
      navigation.popTo('Camera', { filter: selected }, { merge: true });
    }
  };

  return (
    <View style={styles.root}>
      {/* Phần trên: thấy camera phía dưới, phủ màu bộ lọc đang chọn. Chạm vào để đóng. */}
      <Pressable style={styles.preview} onPress={() => navigation.goBack()} accessibilityLabel="Đóng">
        <FilterOverlay name={selected} />
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Đóng">
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
          <View style={styles.currentPill} accessibilityLiveRegion="polite">
            <AppText weight="semibold" size={13} color={colors.white}>{selected ?? 'Không lọc'}</AppText>
          </View>
          <View style={styles.iconBtn} />
        </View>
      </Pressable>

      {/* Bảng chọn bộ lọc */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <View style={styles.panelHeader}>
          <AppText weight="bold" size={18}>Bộ lọc</AppText>
          <Pressable onPress={apply} style={styles.doneBtn} accessibilityRole="button">
            <AppText weight="semibold" size={14} color={colors.white}>Xong</AppText>
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setSelected(undefined)}
            style={[styles.clearBtn, { borderColor: !selected ? colors.primary : colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Bỏ bộ lọc"
            accessibilityState={{ selected: !selected }}
          >
            <Ionicons name="ban-outline" size={18} color={colors.muted} />
          </Pressable>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <AppText weight="semibold" size={13} color={active ? colors.primaryText : colors.muted}>{t.label}</AppText>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={list}
          keyExtractor={(f) => f.name}
          numColumns={4}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const on = item.name === selected;
            return (
              <Pressable onPress={() => setSelected(item.name)} style={styles.tile} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <View style={[styles.tileRing, { borderColor: on ? colors.primary : 'transparent' }]}>
                  <LinearGradient colors={[colors.primarySoft, colors.blueSoft, colors.surface]} style={styles.tileImg}>
                    <Ionicons name="person" size={34} color={colors.placeholder} />
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: item.tint }]} />
                  </LinearGradient>
                  {on && (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                    </View>
                  )}
                </View>
                <AppText weight={on ? 'bold' : 'medium'} size={12} color={on ? colors.primaryText : colors.text} numberOfLines={1}>
                  {item.name}
                </AppText>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  preview: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  currentPill: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.overlay, justifyContent: 'center' },
  panel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: 14,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneBtn: { height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center' },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  tab: { height: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center' },
  tabActive: { backgroundColor: colors.primarySoft },
  grid: { gap: 14 },
  tile: { width: '25%', alignItems: 'center', gap: 6 },
  tileRing: { borderWidth: 3, borderRadius: 18, padding: 2 },
  tileImg: { width: 66, height: 66, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  check: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
