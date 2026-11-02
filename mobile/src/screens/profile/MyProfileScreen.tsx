/**
 * Hồ sơ của tôi — UC07 (nút Đăng xuất: Khánh UC03)
 * Phụ trách: Long
 *
 * - Đã đăng nhập: avatar, số liệu, nút Sửa hồ sơ, 2 tab "Video của tôi" / "Đã thích".
 *   Ô đầu tiên của tab "Video của tôi" là ô mờ "Bản nháp: N" → mở màn Video nháp.
 *   Tab thứ 3 "Lịch sử": video mình đã xem, mới xem nhất trước.
 *   Menu ☰: "Video nháp", "Phát livestream", "Cài đặt", "Đăng xuất" (hỏi xác nhận, xong về Trang chủ).
 *   Quay lại tab này thì tải lại số liệu, ô "Bản nháp" và lưới video.
 * - Khách: hiện màn "Đăng ký tài khoản" (R3).
 */
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Avatar,
  BottomSheet,
  Button,
  EmptyView,
  ErrorView,
  Loading,
  Screen,
  SegmentedTabs,
  VideoThumb,
} from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { usePagedList } from '../../hooks/usePagedList';
import { userApi } from '../../api/catalog';
import { videoApi } from '../../api/videos';
import { formatCount } from '../../utils/format';
import { confirmAsync } from '../../utils/confirm';
import { mediaUrl } from '../../utils/media';
import type { TabScreenProps } from '../../navigation/types';
import type { AuthUser, Video } from '../../types/models';

type Tab = 'mine' | 'liked' | 'history';
/** Một ô trong lưới: ô "Bản nháp" đặc biệt hoặc một video */
type Cell = { kind: 'drafts' } | { kind: 'video'; video: Video };

const GAP = 2;
const COLUMNS = 3;

export default function MyProfileScreen(props: TabScreenProps<'MyProfile'>) {
  const { user } = useAuth();
  // Tách 2 component để hook của phần đã đăng nhập không bị gọi khi là khách
  return user ? <ProfileContent {...props} user={user} /> : <GuestProfile {...props} />;
}

/* ---------- Khách: mời đăng ký ---------- */

function GuestProfile({ navigation }: TabScreenProps<'MyProfile'>) {
  return (
    <Screen>
      <View style={styles.guestHeader}>
        <AppText weight="bold" size={17}>Hồ sơ</AppText>
      </View>
      <View style={styles.guestBody}>
        <View style={styles.guestIcon}>
          <Ionicons name="person-outline" size={44} color={colors.placeholder} />
        </View>
        <AppText weight="bold" size={20} align="center" style={styles.guestTitle}>Đăng ký tài khoản</AppText>
        <AppText size={14} color={colors.muted} align="center">
          Tạo hồ sơ, theo dõi người khác, thả tim video và đăng video của riêng bạn.
        </AppText>
        <Button title="Đăng ký" onPress={() => navigation.navigate('Register')} style={styles.guestBtn} />
        <View style={styles.row}>
          <AppText size={14} color={colors.muted}>Đã có tài khoản? </AppText>
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8} accessibilityRole="link">
            <AppText size={14} weight="bold" color={colors.primaryText}>Đăng nhập</AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

/* ---------- Đã đăng nhập ---------- */

function ProfileContent({ navigation, user }: TabScreenProps<'MyProfile'> & { user: AuthUser }) {
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const cellWidth = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  const [tab, setTab] = useState<Tab>('mine');
  const [menuOpen, setMenuOpen] = useState(false);

  // Số liệu (đang theo dõi, người theo dõi, lượt thích) lấy từ hồ sơ công khai của chính mình
  const profile = useFetch(() => userApi.profile(user.id), [user.id]);
  // Chỉ cần tổng số bản nháp + ảnh bìa bản nháp mới nhất → lấy trang đầu 1 phần tử
  const drafts = useFetch(() => videoApi.myDrafts(0, 1), [user.id]);
  // Video theo tab đang chọn (chủ hồ sơ thấy cả video riêng tư)
  const list = usePagedList(
    (page, size) => (tab === 'mine' ? userApi.videos(user.id, page, size)
      : tab === 'liked' ? userApi.liked(user.id, page, size)
      : videoApi.myHistory(page, size)),
    [tab, user.id],
    12,
  );

  // Quay lại tab Hồ sơ (sau khi đăng/sửa/xoá video, xoá nháp, sửa hồ sơ) thì tải lại.
  // Chỉ bỏ qua lần focus đầu nếu lúc tạo màn đã đang mở tab này (vừa tải xong rồi).
  // Màn được tạo khi đang ở tab khác (vd đăng nhập ở Trang chủ) thì lần đầu mở tab vẫn tải lại.
  const firstFocus = useRef(navigation.isFocused());
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      profile.reload();
      drafts.reload();
      list.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onRefresh = () => {
    profile.reload();
    drafts.reload();
    list.refresh();
  };

  // Menu → mở màn khác: đóng menu trước rồi mới chuyển màn
  const openFromMenu = (go: () => void) => {
    setMenuOpen(false);
    go();
  };

  // Menu → Đăng xuất → hộp xác nhận → về Trang chủ.
  // confirmAsync: điện thoại dùng Alert, bản web dùng window.confirm (Alert trên web không hiện gì).
  const askLogout = () => {
    setMenuOpen(false);
    // Đợi bảng menu đóng hẳn rồi mới hiện Alert (iOS không hiện Alert khi Modal đang đóng)
    setTimeout(async () => {
      if (await confirmAsync('Đăng xuất?', undefined, 'Đăng xuất')) {
        await logout();
        navigation.navigate('Home');
      }
    }, 350);
  };

  const draftCount = drafts.data?.totalElements ?? 0;
  const draftCover = drafts.data?.content[0]?.thumbnailUrl ?? null;

  // Ghép ô "Bản nháp" vào đầu lưới khi đang ở tab Video của tôi và có nháp
  const cells: Cell[] = [
    ...(tab === 'mine' && draftCount > 0 ? [{ kind: 'drafts' } as Cell] : []),
    ...list.items.map((v) => ({ kind: 'video', video: v }) as Cell),
  ];

  const stats = profile.data;

  const header = (
    <View>
      <View style={styles.top}>
        <Avatar uri={user.avatarUrl} name={user.displayName} size={96} />
        <View style={styles.center}>
          <AppText weight="bold" size={18} align="center">{user.displayName}</AppText>
          {!!user.bio && (
            <AppText size={13} color={colors.muted} align="center" style={styles.bio}>{user.bio}</AppText>
          )}
        </View>

        <View style={styles.stats}>
          <Stat
            value={stats ? formatCount(stats.followingCount) : '–'}
            label="Đang theo dõi"
            onPress={() => navigation.navigate('Friends')}
          />
          <Stat
            value={stats ? formatCount(stats.followerCount) : '–'}
            label="Người theo dõi"
            onPress={() => navigation.navigate('Friends')}
          />
          <Stat value={stats ? formatCount(stats.likeCount) : '–'} label="Lượt thích" />
        </View>

        <Button
          title="Sửa hồ sơ"
          variant="secondary"
          onPress={() => navigation.navigate('EditProfile')}
          style={styles.editBtn}
        />
      </View>

      <View style={styles.tabs}>
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'mine', label: 'Video của tôi' },
            { key: 'liked', label: 'Đã thích' },
            { key: 'history', label: 'Lịch sử' },
          ]}
        />
      </View>
    </View>
  );

  const renderCell = ({ item }: { item: Cell }) => {
    if (item.kind === 'drafts') {
      return <DraftsTile count={draftCount} cover={draftCover} width={cellWidth} onPress={() => navigation.navigate('Drafts')} />;
    }
    const v = item.video;
    return (
      <View>
        <VideoThumb
          video={v}
          width={cellWidth}
          // Video của mình → màn quản lý video; đã thích / lịch sử → màn xem, vuốt tiếp trong đúng danh sách đó
          onPress={() => (tab === 'mine'
            ? navigation.navigate('MyVideo', { videoId: v.id })
            : navigation.navigate('Watch', { videoId: v.id, source: tab === 'liked' ? { kind: 'liked', userId: user.id } : { kind: 'history' } }))}
        />
        {tab === 'mine' && v.visibility === 'PRIVATE' && (
          <View style={styles.lock} accessibilityLabel="Chỉ mình tôi">
            <Ionicons name="lock-closed" size={12} color={colors.white} />
          </View>
        )}
      </View>
    );
  };

  return (
    <Screen>
      {/* Thanh trên: @username + nút menu */}
      <View style={styles.header}>
        <AppText weight="bold" size={18} numberOfLines={1} style={styles.flex}>{`@${user.username}`}</AppText>
        <Pressable onPress={() => setMenuOpen(true)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Mở menu">
          <Ionicons name="menu" size={24} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        data={list.loading || list.error ? [] : cells}
        keyExtractor={(c) => (c.kind === 'drafts' ? 'drafts' : String(c.video.id))}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={styles.gridContent}
        renderItem={renderCell}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorView message={list.error} onRetry={list.reload} />
          ) : tab === 'mine' ? (
            <EmptyView icon="videocam-outline" title="Chưa có video nào" message="Bấm nút + ở thanh dưới để quay video đầu tiên." />
          ) : tab === 'liked' ? (
            <EmptyView icon="heart-outline" title="Chưa thích video nào" />
          ) : (
            <EmptyView icon="time-outline" title="Chưa xem video nào" message="Video bạn đã xem sẽ hiện ở đây." />
          )
        }
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} style={styles.more} /> : undefined}
        refreshing={list.refreshing}
        onRefresh={onRefresh}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.5}
      />

      {/* Menu ☰: Video nháp · Phát livestream · Cài đặt · Đăng xuất */}
      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} heightPercent={42}>
        <Pressable onPress={() => openFromMenu(() => navigation.navigate('Drafts'))} style={styles.menuItem} accessibilityRole="button">
          <Ionicons name="document-outline" size={22} color={colors.text} />
          <AppText weight="semibold">Video nháp</AppText>
          {draftCount > 0 && <AppText size={13} color={colors.muted}>{draftCount}</AppText>}
        </Pressable>
        <Pressable onPress={() => openFromMenu(() => navigation.navigate('GoLive'))} style={styles.menuItem} accessibilityRole="button">
          <Ionicons name="radio-outline" size={22} color={colors.text} />
          <AppText weight="semibold">Phát livestream</AppText>
        </Pressable>
        <Pressable onPress={() => openFromMenu(() => navigation.navigate('Settings'))} style={styles.menuItem} accessibilityRole="button">
          <Ionicons name="settings-outline" size={22} color={colors.text} />
          <AppText weight="semibold">Cài đặt</AppText>
        </Pressable>
        <Pressable onPress={askLogout} style={styles.menuItem} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <AppText weight="semibold" color={colors.danger}>Đăng xuất</AppText>
        </Pressable>
      </BottomSheet>
    </Screen>
  );
}

/** Một cột số liệu: số to + nhãn nhỏ */
function Stat({ value, label, onPress }: { value: string; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.stat} accessibilityRole={onPress ? 'button' : undefined}>
      <AppText weight="bold" size={17}>{value}</AppText>
      <AppText size={12} color={colors.muted}>{label}</AppText>
    </Pressable>
  );
}

/** Ô "Bản nháp: N": ảnh bìa bản nháp mới nhất làm mờ + lớp tối + icon */
function DraftsTile({ count, cover, width, onPress }: { count: number; cover: string | null; width: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width, height: Math.round(width * 1.5), backgroundColor: colors.text, overflow: 'hidden' }}
      accessibilityRole="button"
      accessibilityLabel={`Bản nháp: ${count} video`}
    >
      {!!cover && <Image source={{ uri: mediaUrl(cover) }} style={StyleSheet.absoluteFill} blurRadius={6} />}
      <View style={styles.draftOverlay}>
        <Ionicons name="document-outline" size={26} color={colors.white} />
        <AppText weight="bold" size={13} color={colors.white}>{`Bản nháp: ${count}`}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.xl, paddingRight: spacing.md, paddingVertical: 6 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  top: { alignItems: 'center', gap: 10, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  center: { alignItems: 'center' },
  bio: { marginTop: spacing.xs },
  stats: { flexDirection: 'row', marginTop: 6 },
  stat: { width: 100, alignItems: 'center', paddingVertical: spacing.xs },
  editBtn: { alignSelf: 'stretch', height: 44, borderRadius: radius.md, marginTop: 6 },
  tabs: { marginTop: 18 },
  gridContent: { gap: GAP, paddingBottom: spacing.xxl },
  lock: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', gap: 6 },
  more: { marginVertical: spacing.lg },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: spacing.md, borderRadius: radius.md },

  guestHeader: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  guestBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40, paddingBottom: 120 },
  guestIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  guestTitle: { marginTop: spacing.xs },
  guestBtn: { alignSelf: 'stretch', marginTop: 10 },
});
