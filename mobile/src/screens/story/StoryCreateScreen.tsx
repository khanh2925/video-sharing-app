/**
 * Đăng story — UC17
 * Phụ trách: Khánh
 *
 * - Nhận ảnh/video đã chọn qua params: navigation.navigate('StoryCreate', { uri, mediaType }).
 * - Xem trước, có thể "Chọn ảnh khác" (expo-image-picker).
 * - "Đăng story": gửi multipart (file, durationSec) lên POST /stories, xong mở màn Tin của bạn.
 * - Ảnh hiện IMAGE_DURATION_SEC giây; video lấy đúng độ dài video. Backend tự kiểm tra
 *   độ dài tối đa (STORY_MAX_DURATION_SEC, R17), vượt quá thì hiện câu lỗi backend trả về.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppText, Avatar, Screen } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { storyApi } from '../../api/stories';
import { getErrorMessage } from '../../api/client';
import { fileFromUri } from '../../utils/media';
import type { MediaType } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

/** Story là ảnh thì hiện bao nhiêu giây */
const IMAGE_DURATION_SEC = 5;
/** Nền nút "Huỷ" trắng mờ (theme chưa có màu này) */
const WHITE_SOFT = 'rgba(255,255,255,0.14)';

interface Media {
  uri: string;
  mediaType: MediaType;
  mimeType?: string | null;
  /** độ dài video (giây), ảnh thì không có */
  durationSec?: number;
}

export default function StoryCreateScreen({ navigation, route }: RootScreenProps<'StoryCreate'>) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [media, setMedia] = useState<Media>({ uri: route.params.uri, mediaType: route.params.mediaType });
  const [posting, setPosting] = useState(false);

  // ----- Chọn ảnh / video khác -----
  const pickAnother = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setMedia({
      uri: asset.uri,
      mediaType: asset.type === 'video' ? 'VIDEO' : 'IMAGE',
      mimeType: asset.mimeType,
      durationSec: asset.duration ? asset.duration / 1000 : undefined, // image-picker trả mili giây
    });
  };

  // ----- Đăng -----
  const onPost = async () => {
    const durationSec = media.mediaType === 'VIDEO' ? Math.max(1, Math.round(media.durationSec ?? IMAGE_DURATION_SEC)) : IMAGE_DURATION_SEC;
    setPosting(true);
    try {
      await storyApi.create(fileFromUri(media.uri, media.mimeType), durationSec);
      navigation.replace('MyStory'); // thay màn này bằng Tin của bạn, bấm đóng là về chỗ cũ
    } catch (e) {
      Alert.alert('Không đăng được', getErrorMessage(e));
      setPosting(false);
    }
  };

  return (
    <Screen dark edges={[]}>
      {/* Khung xem trước */}
      <View style={[styles.preview, { top: insets.top + spacing.sm, bottom: insets.bottom + 110 }]}>
        {media.mediaType === 'VIDEO' ? (
          <VideoPreview
            key={media.uri}
            uri={media.uri}
            onDuration={(sec) => setMedia((m) => (m.durationSec ? m : { ...m, durationSec: sec }))}
          />
        ) : (
          <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Ảnh sẽ đăng lên story" />
        )}
        <LinearGradient colors={[colors.overlay, 'transparent']} style={styles.shade} pointerEvents="none" />

        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={navigation.goBack} accessibilityLabel="Huỷ" disabled={posting}>
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
          <Pressable style={styles.pickBtn} onPress={pickAnother} disabled={posting}>
            <Ionicons name="image-outline" size={16} color={colors.white} />
            <AppText weight="semibold" size={13} color={colors.white}>Chọn ảnh khác</AppText>
          </Pressable>
        </View>
      </View>

      {/* Phần dưới: ghi chú + 2 nút */}
      <View style={[styles.footer, { bottom: insets.bottom + spacing.lg }]}>
        <AppText size={12} color={colors.border} align="center">Người theo dõi bạn sẽ thấy trong 24 giờ</AppText>
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.cancelBtn]} onPress={navigation.goBack} disabled={posting}>
            <AppText weight="semibold" color={colors.white}>Huỷ</AppText>
          </Pressable>
          <Pressable style={[styles.btn, styles.postBtn, posting && styles.dim]} onPress={onPost} disabled={posting}>
            {posting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <View style={styles.postAvatar}>
                  <Avatar uri={user?.avatarUrl} name={user?.displayName} size={22} />
                </View>
                <AppText weight="semibold" color={colors.white}>Đăng story</AppText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

/** Xem trước video (phát lặp, tắt tiếng). Tải xong báo độ dài video để gửi kèm khi đăng. */
function VideoPreview({ uri, onDuration }: { uri: string; onDuration: (sec: number) => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  useEffect(() => {
    if (player.status === 'readyToPlay' && player.duration > 0) onDuration(player.duration);
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && player.duration > 0) onDuration(player.duration);
    });
    return () => sub.remove();
  }, [player, onDuration]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

const styles = StyleSheet.create({
  preview: { position: 'absolute', left: spacing.sm, right: spacing.sm, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.text },
  shade: { position: 'absolute', left: 0, right: 0, top: 0, height: 140 },
  topBar: { position: 'absolute', top: spacing.md, left: spacing.sm, right: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pickBtn: {
    height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.overlay,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  footer: { position: 'absolute', left: spacing.xl, right: spacing.xl, gap: 10 },
  actions: { flexDirection: 'row', gap: spacing.md },
  btn: { height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: WHITE_SOFT },
  postBtn: { flex: 1.6, backgroundColor: colors.primary },
  dim: { opacity: 0.7 },
  postAvatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
