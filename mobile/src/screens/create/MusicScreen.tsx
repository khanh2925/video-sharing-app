/**
 * Thêm nhạc — UC09
 * Phụ trách: Khánh
 *
 * Mở dạng transparentModal phía trên Camera (hoặc PostVideo).
 * Danh sách nhạc lấy từ GET /api/audios, lọc theo tab và ô tìm kiếm ngay trên máy.
 * Chọn bài → navigate về màn trước kèm { audio }, merge: true (giống Lab 06 bài 1).
 */
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, EmptyView, ErrorView, Loading, SegmentedTabs } from '../../components';
import { catalogApi } from '../../api/catalog';
import { useFetch } from '../../hooks/useFetch';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { formatDuration } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { Audio } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

type TabKey = 'foryou' | 'trend' | 'saved';

export default function MusicScreen({ navigation, route }: RootScreenProps<'Music'>) {
  const insets = useSafeAreaInsets();
  const currentId = route.params?.current;
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TabKey>('foryou');
  const { data, loading, error, reload } = useFetch(() => catalogApi.audios(), []);

  // Lọc theo tab rồi theo từ khoá (tên bài hoặc ca sĩ)
  const songs = useMemo(() => {
    const all = data ?? [];
    const byTab = tab === 'trend' ? all.filter((a) => a.trending) : tab === 'saved' ? [] : all;
    const key = query.trim().toLowerCase();
    return key ? byTab.filter((a) => `${a.title} ${a.artist}`.toLowerCase().includes(key)) : byTab;
  }, [data, tab, query]);

  // Gửi bài đã chọn (hoặc undefined = bỏ nhạc) về đúng màn đã mở Music
  const sendBack = (audio: Audio | undefined) => {
    const state = navigation.getState();
    const previous = state.routes[state.index - 1]?.name;
    if (previous === 'PostVideo') {
      navigation.navigate({ name: 'PostVideo', params: { audio }, merge: true });
    } else {
      navigation.navigate({ name: 'Camera', params: { audio }, merge: true });
    }
  };

  const renderBody = () => {
    if (loading) return <Loading />;
    if (error) return <ErrorView message={error} onRetry={reload} />;
    if (tab === 'saved') {
      return <EmptyView icon="bookmark-outline" title="Chưa có bài đã lưu" message="Tính năng sẽ có ở phiên bản sau" />;
    }
    return (
      <FlatList
        data={songs}
        keyExtractor={(a) => String(a.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <AppText size={14} color={colors.muted} align="center" style={styles.noMatch}>Không có bài nào khớp</AppText>
        }
        renderItem={({ item }) => {
          const chosen = item.id === currentId;
          return (
            <View style={[styles.row, chosen && styles.rowChosen]}>
              <View style={styles.cover}>
                {item.coverUrl ? (
                  <Image source={{ uri: mediaUrl(item.coverUrl) }} style={StyleSheet.absoluteFill} />
                ) : null}
                <View style={styles.coverShade}>
                  <Ionicons name="musical-notes" size={18} color={colors.white} />
                </View>
              </View>
              <View style={styles.texts}>
                <AppText weight="semibold" size={14} numberOfLines={1}>{item.title}</AppText>
                <AppText size={12} color={colors.muted} numberOfLines={1}>
                  {`${item.artist} · ${formatDuration(item.durationSec)}`}
                </AppText>
              </View>
              {/* Bấm "Đã chọn" lần nữa thì bỏ nhạc */}
              <Pressable
                onPress={() => sendBack(chosen ? undefined : item)}
                style={[styles.useBtn, chosen && styles.useBtnChosen]}
                accessibilityRole="button"
                accessibilityLabel={chosen ? `Bỏ chọn ${item.title}` : `Dùng ${item.title}`}
              >
                <AppText weight="semibold" size={13} color={chosen ? colors.white : colors.primaryText}>
                  {chosen ? 'Đã chọn' : 'Dùng'}
                </AppText>
              </Pressable>
            </View>
          );
        }}
      />
    );
  };

  return (
    <View style={styles.root}>
      {/* Vùng trống phía trên: chạm để đóng */}
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()} accessibilityLabel="Đóng" />

      <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.header}>
          <AppText weight="bold" size={18}>Thêm nhạc</AppText>
          <View style={styles.headerRight}>
            {currentId !== undefined && (
              <Pressable onPress={() => sendBack(undefined)} hitSlop={8} accessibilityRole="button">
                <AppText weight="semibold" size={13} color={colors.danger}>Bỏ nhạc</AppText>
              </Pressable>
            )}
            <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Đóng">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm bài hát…"
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Tìm bài hát"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Xoá từ khoá">
              <Ionicons name="close-circle" size={18} color={colors.placeholder} />
            </Pressable>
          )}
        </View>

        <View>
          <SegmentedTabs
            variant="pill"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'foryou', label: 'Dành cho bạn' },
              { key: 'trend', label: 'Thịnh hành' },
              { key: 'saved', label: 'Đã lưu' },
            ]}
          />
        </View>

        <View style={styles.body}>{renderBody()}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { height: '36%' },
  panel: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  closeBtn: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  search: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, paddingVertical: 0 },
  body: { flex: 1 },
  list: { gap: 4, paddingBottom: spacing.lg },
  noMatch: { marginTop: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: radius.lg },
  rowChosen: { backgroundColor: colors.primarySoft },
  cover: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.primary },
  coverShade: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2, minWidth: 0 },
  useBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  useBtnChosen: { backgroundColor: colors.primary },
});
