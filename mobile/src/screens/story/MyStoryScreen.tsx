/**
 * MyStory (Tin của bạn) — UC18
 * Phụ trách: Khánh
 *
 * - Xem lại story của chính mình (nhóm có mine = true trong GET /stories/feed).
 * - Nút "Xoá": hỏi xác nhận rồi xoá story đang xem (DELETE /stories/{id}).
 * - Nút "Thêm tin": chọn ảnh / video trong máy rồi sang màn Đăng story.
 * Thanh tiến độ, ảnh/video dùng lại từ StoryViewScreen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Avatar, Button, EmptyView, ErrorView, Header, Loading, Screen } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { storyApi } from '../../api/stories';
import { getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { timeAgo } from '../../utils/format';
import type { Story } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';
import { StoryMedia, StoryMusicLabel, StoryProgressBars, useStoryProgress } from './StoryViewScreen';

export default function MyStoryScreen({ navigation }: RootScreenProps<'MyStory'>) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useFetch(() => storyApi.feed(), []);

  const [stories, setStories] = useState<Story[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // dừng khi đang hỏi xác nhận / đang chọn ảnh
  const [deleting, setDeleting] = useState(false);
  const [holding, setHolding] = useState(false); // đang giữ ngón tay trên màn
  // Sang màn Đăng story thì dừng tin này (cả nhạc), quay lại thì chạy tiếp
  const isFocused = useIsFocused();
  const stopped = paused || holding || !isFocused;

  // Lấy nhóm story của mình
  useEffect(() => {
    if (data) setStories(data.find((g) => g.mine)?.stories ?? []);
  }, [data]);

  // Đăng tin mới xong quay lại màn này → tải lại danh sách tin
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  const story = stories[index];

  const goNext = () => {
    if (index < stories.length - 1) setIndex(index + 1);
    else navigation.goBack(); // xem hết thì đóng
  };
  const goPrev = () => setIndex(Math.max(0, index - 1));

  const progress = useStoryProgress(story ? String(story.id) : null, story?.durationSec ?? 0, stopped, goNext);

  // ----- Thêm tin: chọn ảnh/video rồi sang màn Đăng story -----
  const onAdd = async () => {
    setPaused(true);
    const result = await ImagePicker.launchImageLibraryAsync({ preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, mediaTypes: ['images', 'videos'], quality: 0.8 });
    setPaused(false);
    if (result.canceled) return;
    const asset = result.assets[0];
    navigation.navigate('StoryCreate', {
      uri: asset.uri,
      mediaType: asset.type === 'video' ? 'VIDEO' : 'IMAGE',
      // ImagePicker trả duration theo mili giây (có thể không có)
      durationSec: asset.duration ? Math.max(1, Math.round(asset.duration / 1000)) : undefined,
    });
  };

  // ----- Xoá tin đang xem (hỏi xác nhận) -----
  const onDelete = () => {
    if (!story) return;
    setPaused(true);
    Alert.alert('Xoá tin này?', 'Không khôi phục được.', [
      { text: 'Huỷ', style: 'cancel', onPress: () => setPaused(false) },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await storyApi.remove(story.id);
            const rest = stories.filter((s) => s.id !== story.id);
            if (rest.length === 0) {
              navigation.goBack(); // xoá hết thì đóng
              return;
            }
            setStories(rest);
            setIndex(Math.min(index, rest.length - 1));
          } catch (e) {
            Alert.alert('Không xoá được', getErrorMessage(e));
          } finally {
            setDeleting(false);
            setPaused(false);
          }
        },
      },
    ], { onDismiss: () => setPaused(false) });
  };

  if (loading) {
    return (
      <Screen dark edges={[]}>
        <Loading dark />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <Header title="Tin của bạn" />
        <ErrorView message={error} onRetry={reload} />
      </Screen>
    );
  }
  // Chưa có tin nào (hoặc đã hết hạn)
  if (!story) {
    return (
      <Screen>
        <View style={styles.emptyHeader}>
          <Pressable style={styles.closeBtn} onPress={navigation.goBack} accessibilityLabel="Đóng">
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <EmptyView icon="images-outline" title="Bạn chưa có tin nào" message="Tin sẽ tự ẩn sau một thời gian" />
        <View style={styles.emptyAction}>
          <Button title="Thêm tin" icon="add" onPress={onAdd} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen dark edges={[]}>
      <StoryMedia story={story} paused={stopped} />
      <LinearGradient colors={[colors.overlay, 'transparent']} style={styles.topShade} pointerEvents="none" />
      <LinearGradient colors={['transparent', colors.overlay]} style={styles.bottomShade} pointerEvents="none" />

      {/* Vùng chạm: trái = lùi, phải = tới */}
      <View style={[styles.tapRow, { top: insets.top + 100, bottom: insets.bottom + 100 }]}>
        <Pressable
          style={styles.tapPrev}
          onPress={goPrev}
          onLongPress={() => setHolding(true)}
          onPressOut={() => setHolding(false)}
          accessibilityLabel="Tin trước"
        />
        <Pressable
          style={styles.tapNext}
          onPress={goNext}
          onLongPress={() => setHolding(true)}
          onPressOut={() => setHolding(false)}
          accessibilityLabel="Tin tiếp theo"
        />
      </View>

      {story.audio && <StoryMusicLabel audio={story.audio} style={[styles.music, { bottom: insets.bottom + 90 }]} />}

      <View style={[styles.top, { top: insets.top + spacing.sm }]}>
        <StoryProgressBars count={stories.length} current={index} progress={progress} />
        <View style={styles.headerRow}>
          <View style={styles.avatarBorder}>
            <Avatar uri={user?.avatarUrl} name={user?.displayName} size={32} />
          </View>
          <AppText weight="bold" size={14} color={colors.white}>Tin của bạn</AppText>
          <AppText size={13} color={colors.white} style={styles.time}>{timeAgo(story.createdAt)}</AppText>
          <View style={styles.flex} />
          <Pressable style={styles.closeBtn} onPress={navigation.goBack} accessibilityLabel="Đóng">
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {/* Hàng nút dưới: Thêm tin · Xoá */}
      <View style={[styles.bottom, { bottom: insets.bottom + 30 }]}>
        <Pressable style={styles.pillBtn} onPress={onAdd}>
          <Ionicons name="add-circle-outline" size={18} color={colors.white} />
          <AppText weight="semibold" size={14} color={colors.white}>Thêm tin</AppText>
        </Pressable>
        <Pressable style={styles.pillBtn} onPress={onDelete} disabled={deleting}>
          <Ionicons name="trash-outline" size={16} color={colors.white} />
          <AppText weight="semibold" size={14} color={colors.white}>{deleting ? 'Đang xoá…' : 'Xoá'}</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 160 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 },
  tapRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  tapPrev: { width: '35%' },
  tapNext: { flex: 1 },
  top: { position: 'absolute', left: spacing.md, right: spacing.md, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBorder: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  time: { opacity: 0.85 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  music: { position: 'absolute', left: spacing.lg },
  bottom: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' },
  pillBtn: {
    height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.overlay,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  emptyHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md },
  emptyAction: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
});
