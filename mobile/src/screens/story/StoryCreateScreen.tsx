/**
 * Đăng story — UC17
 * Phụ trách: Khánh
 *
 * - Nhận ảnh/video đã chọn qua params: navigation.navigate('StoryCreate', { uri, mediaType, durationSec }).
 * - Xem trước, có thể "Chọn ảnh khác" (expo-image-picker).
 * - "Thêm nhạc": mở màn Music, bài chọn gửi về qua route.params.audio (navigate + merge).
 *   Xem trước thì phát nhạc đó, video tắt tiếng gốc.
 * - "Đăng story": gửi multipart (file, durationSec, audioId) lên POST /stories, xong mở màn Tin của bạn.
 * - Ảnh hiện IMAGE_DURATION_SEC giây; video lấy đúng độ dài video (từ ImagePicker, không có thì chờ
 *   trình phát báo, chưa biết độ dài thì chưa cho bấm Đăng). Backend tự kiểm tra
 *   độ dài tối đa (STORY_MAX_DURATION_SEC, R17), vượt quá thì hiện câu lỗi backend trả về.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppText, Avatar, Screen } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { storyApi } from '../../api/stories';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { getErrorMessage } from '../../api/client';
import { fileFromUri } from '../../utils/media';
import type { MediaType } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

/** Story là ảnh thì hiện bao nhiêu giây */
const IMAGE_DURATION_SEC = 5;

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
  const [media, setMedia] = useState<Media>({
    uri: route.params.uri,
    mediaType: route.params.mediaType,
    durationSec: route.params.durationSec,
  });
  const [posting, setPosting] = useState(false);
  const [picking, setPicking] = useState(false); // đang mở thư viện ảnh thì tạm dừng nhạc
  const audio = route.params.audio;

  // Phát nhạc đã chọn khi đang ở màn này (mở Music / rời màn thì dừng)
  const isFocused = useIsFocused();
  useBackgroundMusic(audio?.fileUrl, isFocused && !posting && !picking);

  // ----- Chọn ảnh / video khác -----
  const pickAnother = async () => {
    setPicking(true);
    const result = await ImagePicker.launchImageLibraryAsync({ preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, mediaTypes: ['images', 'videos'], quality: 0.8 });
    setPicking(false);
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
  // Video chưa biết độ dài thì chưa cho đăng (không đoán bừa, backend cần độ dài thật)
  const waitingDuration = media.mediaType === 'VIDEO' && !media.durationSec;
  const canPost = !posting && !waitingDuration;

  const onPost = async () => {
    if (!canPost) return;
    const durationSec = media.mediaType === 'VIDEO' ? Math.max(1, Math.round(media.durationSec!)) : IMAGE_DURATION_SEC;
    setPosting(true);
    try {
      await storyApi.create(fileFromUri(media.uri, media.mimeType), durationSec, audio?.id);
      // Mở từ màn Tin của bạn → quay về màn đó (không chồng thêm); mở từ chỗ khác → thay màn này bằng Tin của bạn
      const fromMyStory = navigation.getState().routes.some((r) => r.name === 'MyStory');
      if (fromMyStory) navigation.popTo('MyStory');
      else navigation.replace('MyStory');
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
            muted={!!audio}
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

        {/* Nút "Thêm nhạc" giống màn Quay video, đã chọn thì hiện tên bài + nút X bỏ nhạc */}
        <View style={styles.musicRow}>
          <View style={styles.musicPill}>
            <Pressable
              style={styles.musicOpen}
              onPress={() => navigation.navigate('Music', { current: audio?.id })}
              disabled={posting}
              accessibilityRole="button"
              accessibilityLabel={audio ? `Đổi nhạc, đang chọn ${audio.title}` : 'Thêm nhạc'}
            >
              <Ionicons name="musical-notes" size={15} color={colors.white} />
              <AppText weight="semibold" size={14} color={colors.white} numberOfLines={1} style={styles.musicText}>
                {audio ? audio.title : 'Thêm nhạc'}
              </AppText>
            </Pressable>
            {audio && (
              <Pressable
                onPress={() => navigation.setParams({ audio: undefined })}
                hitSlop={8}
                disabled={posting}
                accessibilityRole="button"
                accessibilityLabel="Bỏ nhạc"
              >
                <Ionicons name="close-circle" size={18} color={colors.white} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Phần dưới: ghi chú + 2 nút */}
      <View style={[styles.footer, { bottom: insets.bottom + spacing.lg }]}>
        <AppText size={12} color={colors.border} align="center">
          {waitingDuration ? 'Đang đọc độ dài video…' : 'Người theo dõi bạn sẽ thấy tin này trong thời gian giới hạn'}
        </AppText>
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.cancelBtn]} onPress={navigation.goBack} disabled={posting}>
            <AppText weight="semibold" color={colors.white}>Huỷ</AppText>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.postBtn, !canPost && styles.dim]}
            onPress={onPost}
            disabled={!canPost}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPost }}
          >
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

/** Xem trước video (phát lặp). Có nhạc thì tắt tiếng gốc. Tải xong báo độ dài video để gửi kèm khi đăng. */
function VideoPreview({ uri, muted, onDuration }: { uri: string; muted: boolean; onDuration: (sec: number) => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);
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
  musicRow: { position: 'absolute', top: spacing.md + 56, left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  musicPill: {
    height: 36, maxWidth: 220, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.overlay,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  musicOpen: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  musicText: { flexShrink: 1 },
  footer: { position: 'absolute', left: spacing.xl, right: spacing.xl, gap: 10 },
  actions: { flexDirection: 'row', gap: spacing.md },
  btn: { height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: colors.whiteSoft },
  postBtn: { flex: 1.6, backgroundColor: colors.primary },
  dim: { opacity: 0.7 },
  postAvatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
