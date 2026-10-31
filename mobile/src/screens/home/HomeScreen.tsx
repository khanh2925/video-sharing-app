/**
 * Trang chủ — UC05 (thanh story: Khánh UC18)
 * Phụ trách: Thanh
 *
 * Các khối từ trên xuống: thanh story · Top trending · Chủ đề · Đang live · Âm thanh nổi bật.
 * Khách (chưa đăng nhập, R3): đầu màn có nút "Đăng nhập" thay cho chuông; thanh story chỉ có
 * bong bóng "Đăng tin" (bấm vào hiện bảng đăng nhập), vì API story bắt buộc đăng nhập.
 */
import { useCallback, useRef, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Avatar, Button, Screen } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../context/LoginPromptContext';
import { useFetch } from '../../hooks/useFetch';
import { videoApi } from '../../api/videos';
import { catalogApi } from '../../api/catalog';
import { storyApi } from '../../api/stories';
import { liveApi } from '../../api/lives';
import { formatCount } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { SearchTab, TabScreenProps } from '../../navigation/types';
import type { Audio, LiveStream, StoryGroup, Topic, Video } from '../../types/models';

type IconName = keyof typeof Ionicons.glyphMap;

/** Backend lưu tên chủ đề tiếng Anh → đổi sang tiếng Việt để hiển thị */
const TOPIC_LABELS: Record<string, string> = {
  Sports: 'Thể thao',
  Podcasts: 'Podcast',
  News: 'Tin tức',
  Travel: 'Du lịch',
  Health: 'Sức khoẻ',
  Weather: 'Thời tiết',
  Art: 'Nghệ thuật',
  Pets: 'Thú cưng',
};

/** Tên icon backend gửi có cái không có trong Ionicons → đổi sang tên gần nhất */
function topicIcon(icon: string | null): IconName {
  if (icon === 'palette') return 'color-palette';
  if (icon && icon in Ionicons.glyphMap) return icon as IconName;
  return 'pricetag';
}

const soon = () => Alert.alert('Thông báo', 'Tính năng sẽ có ở phiên bản sau');

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  // Mỗi khối gọi 1 API riêng, khối nào lỗi thì chỉ khối đó trống
  const trending = useFetch(() => videoApi.trending(0, 10), []);
  const topics = useFetch(() => catalogApi.topics(), []);
  // Xem live cần đăng nhập (UC14): khách thì không gọi API, khối "Đang live" ẩn đi
  const lives = useFetch(() => (user ? liveApi.active() : Promise.resolve([])), [user?.id]);
  const audios = useFetch(() => catalogApi.audios(), []);
  // Story cần đăng nhập: khách thì trả mảng rỗng, không gọi API
  const stories = useFetch<StoryGroup[]>(() => (user ? storyApi.feed() : Promise.resolve([])), [user?.id]);

  // Quay lại Trang chủ (vd sau khi đăng story / xem story) thì tải lại thanh story
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      stories.reload();
      lives.reload();
      trending.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([trending.reload(), topics.reload(), lives.reload(), audios.reload(), stories.reload()]);
    setRefreshing(false);
  };

  // Đăng tin: chọn ảnh/video trong máy rồi mở màn StoryCreate
  const createStory = () =>
    requireAuth(async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
          mediaTypes: ['images', 'videos'], quality: 0.8,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        navigation.navigate('StoryCreate', {
          uri: asset.uri,
          mediaType: asset.type === 'video' ? 'VIDEO' : 'IMAGE',
          // ImagePicker trả duration theo mili giây (có thể không có)
          durationSec: asset.duration ? Math.max(1, Math.round(asset.duration / 1000)) : undefined,
        });
      } catch {
        Alert.alert('Không mở được thư viện', 'Kiểm tra quyền truy cập ảnh và thử lại.');
      }
    });

  // nonce: mở lại cùng từ khoá vẫn tìm lại (dù ô tìm kiếm đã bị sửa)
  const goSearch = (q = '', tab: SearchTab = 'video') => navigation.navigate('Search', { q, tab, nonce: Date.now() });

  const trendingVideos = trending.data?.content ?? [];
  const liveList = lives.data ?? [];
  const hotAudios = (audios.data ?? []).filter((a) => a.trending);

  return (
    <Screen>
      {/* Đầu trang: logo + chuông (đã đăng nhập) hoặc nút Đăng nhập (khách) */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <View style={styles.logoMark}>
            <View style={styles.logoStroke} />
            <View style={styles.logoStroke} />
          </View>
          <AppText weight="bold" size={20}>Video Sharing</AppText>
        </View>
        {user ? (
          <Pressable onPress={soon} style={styles.bell} accessibilityRole="button" accessibilityLabel="Thông báo">
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.loginPill} accessibilityRole="button">
            <AppText weight="semibold" size={14} color={colors.white}>Đăng nhập</AppText>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Thanh story */}
        <StoryBar
          groups={user ? stories.data ?? [] : []}
          isGuest={!user}
          myName={user?.displayName}
          myAvatar={user?.avatarUrl}
          onCreate={createStory}
          onOpenMine={() => navigation.navigate('MyStory')}
          onOpen={(ownerId) => navigation.navigate('StoryView', { ownerId })}
        />

        {/* Top trending */}
        <SectionHeader title="Top trending" linkLabel="Tất cả video" onLink={() => goSearch()} />
        {trending.loading ? (
          <AppText size={13} color={colors.muted} style={styles.note}>Đang tải…</AppText>
        ) : trending.error ? (
          <AppText size={13} color={colors.muted} style={styles.note}>{trending.error}</AppText>
        ) : trendingVideos.length === 0 ? (
          <AppText size={13} color={colors.muted} style={styles.note}>Chưa có video nào</AppText>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
            {trendingVideos.map((v) => (
              <TrendingCard key={v.id} video={v} onPress={() => navigation.navigate('Watch', { videoId: v.id, source: { kind: 'trending' } })} />
            ))}
          </ScrollView>
        )}

        {/* Chủ đề: lưới 4 cột */}
        {(topics.data?.length ?? 0) > 0 && (
          <>
            <SectionHeader title="Chủ đề" />
            <View style={styles.topicGrid}>
              {topics.data!.map((t) => (
                <TopicTile key={t.id} topic={t} onPress={() => navigation.navigate('Watch', { source: { kind: 'topic', topicId: t.id } })} />
              ))}
            </View>
          </>
        )}

        {user && (
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
            <Button title="Phát livestream" onPress={() => requireAuth(() => navigation.navigate('GoLive'))} />
          </View>
        )}
        {/* Đang live (ẩn khi không có ai live hoặc đang là khách) */}
        {!!user && liveList.length > 0 && (
          <>
            <SectionHeader title="Đang live" linkLabel="Tất cả live" onLink={() => goSearch('', 'live')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
              {liveList.map((l) => (
                <LiveCard key={l.id} live={l} onPress={() => requireAuth(() => navigation.navigate(l.host.id === user?.id ? 'LiveHost' : 'LiveWatch', { liveId: l.id }))} />
              ))}
            </ScrollView>
          </>
        )}

        {/* Âm thanh nổi bật */}
        {hotAudios.length > 0 && (
          <>
            <SectionHeader title="Âm thanh nổi bật" linkLabel="Tất cả âm thanh" onLink={() => goSearch('', 'audio')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.hRow, styles.audioRow]}>
              {hotAudios.map((a) => (
                <AudioCard key={a.id} audio={a} onPress={() => goSearch(a.title, 'audio')} />
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/* ---------- Các khối nhỏ dùng trong màn ---------- */

function SectionHeader({ title, linkLabel, onLink }: { title: string; linkLabel?: string; onLink?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText weight="bold" size={18}>{title}</AppText>
      {!!linkLabel && (
        <Pressable onPress={onLink} hitSlop={8} accessibilityRole="link">
          <AppText weight="semibold" size={13} color={colors.primaryText}>{linkLabel}</AppText>
        </Pressable>
      )}
    </View>
  );
}

interface StoryBarProps {
  groups: StoryGroup[];
  isGuest: boolean;
  myName?: string;
  myAvatar?: string | null;
  onCreate: () => void;
  onOpenMine: () => void;
  onOpen: (ownerId: number) => void;
}

/** Hàng story: bong bóng của mình đầu tiên, sau đó là người mình theo dõi */
function StoryBar({ groups, isGuest, myName, myAvatar, onCreate, onOpenMine, onOpen }: StoryBarProps) {
  const mine = groups.find((g) => g.mine);
  const others = groups.filter((g) => !g.mine);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
      {isGuest ? (
        // Khách: bong bóng viền nét đứt, bấm vào hiện bảng đăng nhập
        <View style={styles.storyItem}>
          <Pressable onPress={onCreate} style={styles.dashedBubble} accessibilityRole="button" accessibilityLabel="Đăng tin mới">
            <Ionicons name="add" size={24} color={colors.primaryText} />
          </Pressable>
          <AppText weight="medium" size={12}>Đăng tin</AppText>
        </View>
      ) : (
        // Đã đăng nhập: avatar của mình + nút (+) nhỏ góc dưới phải
        <View style={styles.storyItem}>
          <Avatar
            uri={myAvatar}
            name={myName}
            size={60}
            ring={mine ? (mine.allViewed ? 'seen' : 'unseen') : 'none'}
            onPress={mine ? onOpenMine : onCreate}
          />
          <Pressable onPress={onCreate} style={styles.addBadge} accessibilityRole="button" accessibilityLabel="Đăng tin mới">
            <Ionicons name="add" size={16} color={colors.white} />
          </Pressable>
          <AppText weight="medium" size={12} numberOfLines={1}>Tin của bạn</AppText>
        </View>
      )}

      {others.map((g) => (
        <Pressable
          key={g.owner.id}
          style={styles.storyItem}
          onPress={() => onOpen(g.owner.id)}
          accessibilityRole="button"
          accessibilityLabel={`Xem tin của ${g.owner.displayName}`}
        >
          <Avatar uri={g.owner.avatarUrl} name={g.owner.displayName} size={60} ring={g.allViewed ? 'seen' : 'unseen'} />
          <AppText size={12} numberOfLines={1} color={g.allViewed ? colors.muted : colors.text}>
            {g.owner.displayName}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** Thẻ video dọc 140×196, tiêu đề + lượt xem nằm trên lớp tối dần */
function TrendingCard({ video, onPress }: { video: Video; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.trendCard} accessibilityLabel={video.title}>
      {video.thumbnailUrl ? (
        <Image source={{ uri: mediaUrl(video.thumbnailUrl) }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noThumb]}>
          <Ionicons name="videocam-outline" size={28} color={colors.placeholder} />
        </View>
      )}
      <LinearGradient colors={['transparent', colors.overlay]} style={styles.cardBottom}>
        <AppText weight="semibold" size={14} color={colors.white} numberOfLines={1}>{video.title}</AppText>
        <View style={styles.inline}>
          <Ionicons name="eye-outline" size={12} color={colors.white} />
          <AppText size={11} color={colors.white}>{`${formatCount(video.viewCount)} lượt xem`}</AppText>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** Ô chủ đề: icon + tên, nền là màu của chủ đề pha nhạt */
function TopicTile({ topic, onPress }: { topic: Topic; onPress: () => void }) {
  const tint = topic.color ?? colors.primary;
  return (
    <Pressable onPress={onPress} style={[styles.topicTile, { backgroundColor: `${tint}1F` }]} accessibilityRole="button">
      <Ionicons name={topicIcon(topic.icon)} size={22} color={tint} />
      <AppText weight="medium" size={12} numberOfLines={1}>{TOPIC_LABELS[topic.name] ?? topic.name}</AppText>
    </Pressable>
  );
}

/** Thẻ live: nhãn LIVE, số người xem, người phát + tiêu đề */
function LiveCard({ live, onPress }: { live: LiveStream; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.liveCard} accessibilityLabel={`Live: ${live.title}`}>
      {live.thumbnailUrl ? (
        <Image source={{ uri: mediaUrl(live.thumbnailUrl) }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noThumb]}>
          <Ionicons name="radio-outline" size={28} color={colors.placeholder} />
        </View>
      )}
      <View style={styles.liveBadge}>
        <AppText weight="bold" size={11} color={colors.white}>LIVE</AppText>
      </View>
      <View style={styles.viewerBadge}>
        <Ionicons name="eye-outline" size={12} color={colors.white} />
        <AppText size={11} color={colors.white}>{formatCount(live.viewerCount)}</AppText>
      </View>
      <LinearGradient colors={['transparent', colors.overlay]} style={[styles.cardBottom, styles.liveBottom]}>
        <Avatar uri={live.host.avatarUrl} name={live.host.displayName} size={28} />
        <View style={styles.flex}>
          <AppText weight="semibold" size={13} color={colors.white} numberOfLines={1}>{live.title}</AppText>
          <AppText size={11} color={colors.white} numberOfLines={1}>{live.host.displayName}</AppText>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** Ô âm thanh: ảnh bìa vuông + tên bài + nghệ sĩ */
function AudioCard({ audio, onPress }: { audio: Audio; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.audioCard} accessibilityLabel={`${audio.title} – ${audio.artist}`}>
      {audio.coverUrl ? (
        <Image source={{ uri: mediaUrl(audio.coverUrl) }} style={styles.audioCover} />
      ) : (
        <View style={[styles.audioCover, styles.noThumb]}>
          <Ionicons name="musical-notes" size={28} color={colors.primary} />
        </View>
      )}
      <AppText weight="semibold" size={13} numberOfLines={1}>{audio.title}</AppText>
      <AppText size={11} color={colors.muted} numberOfLines={1} style={styles.audioArtist}>{audio.artist}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { flexDirection: 'row', gap: 5, transform: [{ skewX: '-24deg' }] },
  logoStroke: { width: 5, height: 20, borderRadius: 3, backgroundColor: colors.primary },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPill: { height: 40, paddingHorizontal: spacing.lg, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center' },
  content: { paddingBottom: 28 },
  note: { paddingHorizontal: spacing.xl },

  storyRow: { gap: 14, paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 18 },
  storyItem: { width: 72, alignItems: 'center', gap: 6 }, // 72: đủ chỗ cho chữ "Tin của bạn"
  dashedBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.placeholder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBadge: {
    position: 'absolute',
    right: -4,
    top: 34,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    minHeight: 44,
  },
  hRow: { gap: spacing.md, paddingHorizontal: spacing.xl },
  noThumb: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  trendCard: { width: 140, height: 196, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  cardBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 28, paddingHorizontal: 10, paddingBottom: 10, gap: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: spacing.xl },
  topicTile: {
    width: '22.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },

  liveCard: { width: 168, height: 210, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  liveBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: colors.live, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6 },
  viewerBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  audioRow: { gap: 14 },
  audioCard: { width: 96, gap: 6 },
  audioCover: { width: 96, height: 96, borderRadius: radius.md },
  audioArtist: { marginTop: -4 },
});
