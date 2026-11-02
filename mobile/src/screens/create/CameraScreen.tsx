/**
 * Quay video — UC08
 * Phụ trách: Khánh
 *
 * - Xin quyền camera + micro, quay bằng CameraView (mode="video") của expo-camera.
 * - Đổi camera trước/sau, đèn flash, hẹn giờ 3 / 10 giây.
 * - "Tải lên": chọn video có sẵn trong máy (expo-image-picker).
 * - Bộ lọc và nhạc chọn ở màn Filter / Music, gửi về qua route.params (navigate + merge).
 * - Quay xong hoặc chọn xong → sang PostVideo { videoUri, filter, audio }.
 * - Chế độ Story (UC17): quay tối đa STORY_MAX_DURATION_SEC giây (lấy từ GET /settings) hoặc chọn
 *   ảnh/video trong máy → sang StoryCreate.
 * - Trên web expo-camera không quay được video → báo người dùng dùng "Tải lên".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigationState, usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { catalogApi } from '../../api/catalog';
import { AppText, Button, Loading, Screen } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import type { RootScreenProps } from '../../navigation/types';
import { FilterOverlay } from './FilterScreen';

/** Các mức hẹn giờ (giây) và nhãn hiển thị */
const TIMERS = [0, 3, 10];
const TIMER_LABELS = ['Hẹn giờ', '3 giây', '10 giây'];
/** Màu vàng khi bật flash, lấy theo design (theme chưa có màu này) */
const FLASH_ON_COLOR = colors.flash;

/** Thời lượng quay tối đa (giây), quay tới đây camera tự dừng */
const VIDEO_MAX_DURATION_SEC = 60;
/** Độ dài story mặc định khi chưa đọc được STORY_MAX_DURATION_SEC từ backend */
const STORY_DEFAULT_MAX_SEC = 15;
/**
 * Dung lượng tối đa khi chọn video trong máy (MB). Backend có VIDEO_MAX_SIZE_MB chỉnh được
 * trong system_settings (R17), số ở đây chỉ để chặn sớm cho đỡ tải lên vô ích.
 */
const VIDEO_MAX_MB = 100;

/** Màu mờ trên nền camera (theme chưa có token cho màu trong suốt) */
const SHADE_COLOR = 'rgba(0,0,0,0.6)';        // dải tối phía dưới
const TEXT_SHADOW_COLOR = 'rgba(0,0,0,0.5)';  // bóng chữ / icon
const RECORD_RING_COLOR = 'rgba(255,255,255,0.85)'; // viền nút quay

/** 12 → "00:12" */
function clock(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CameraScreen({ navigation, route }: RootScreenProps<'Camera'>) {
  const insets = useSafeAreaInsets();
  const filter = route.params?.filter;
  const audio = route.params?.audio;

  // Quyền camera và micro (quay video cần cả hai)
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flashOn, setFlashOn] = useState(false);
  const [timerIndex, setTimerIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [lastUri, setLastUri] = useState<string | null>(null);
  // Chế độ quay: video thường (sang PostVideo) hoặc story (sang StoryCreate)
  const [mode, setMode] = useState<'video' | 'story'>(route.params?.mode ?? 'video');
  const [storyMaxSec, setStoryMaxSec] = useState(STORY_DEFAULT_MAX_SEC);
  const isStory = mode === 'story';

  // Camera đang mở sẵn trong stack mà được gọi lại với mode khác (navigate gộp params)
  const paramMode = route.params?.mode;
  useEffect(() => {
    if (paramMode) setMode(paramMode);
  }, [paramMode]);

  // Đọc độ dài story tối đa do quản trị viên cấu hình (R17), lỗi thì giữ mặc định
  useEffect(() => {
    catalogApi
      .settings()
      .then((s) => s.STORY_MAX_DURATION_SEC && setStoryMaxSec(s.STORY_MAX_DURATION_SEC))
      .catch(() => {});
  }, []);

  // true = người dùng bấm "Bỏ video" → quay xong không chuyển sang PostVideo
  const discardRef = useRef(false);
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  // Quay lại màn này (sau khi đăng / bỏ video ở PostVideo) thì quên video cũ, tránh "Tiếp" mở lại video đã xử lý
  useFocusEffect(
    useCallback(() => {
      setLastUri(null);
    }, []),
  );

  // Chỉ bật camera khi màn trên cùng là Camera hoặc 2 bảng trong suốt Filter / Music
  const topRoute = useNavigationState((state) => state.routes[state.index]?.name);
  const cameraActive = topRoute === 'Camera' || topRoute === 'Filter' || topRoute === 'Music';

  // Đếm giây khi đang quay
  useEffect(() => {
    if (!recording) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Đếm ngược hẹn giờ: về 0 thì bắt đầu quay
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      startRecording();
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // Đang quay mà rời màn (nút X, vuốt, nút back Android) thì hỏi xác nhận
  usePreventRemove(recording, ({ data }) => {
    Alert.alert('Bỏ video đang quay?', `Đoạn ${clock(elapsedRef.current)} sẽ bị xoá.`, [
      { text: 'Tiếp tục quay', style: 'cancel' },
      {
        text: 'Bỏ video',
        style: 'destructive',
        onPress: () => {
          discardRef.current = true;
          cameraRef.current?.stopRecording();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const goToPost = (videoUri: string) => {
    navigation.navigate('PostVideo', { videoUri, filter, audio });
  };

  // Video vừa quay đi tiếp theo chế độ đang chọn
  const goNext = (uri: string) => {
    if (isStory) navigation.navigate('StoryCreate', { uri, mediaType: 'VIDEO' });
    else goToPost(uri);
  };

  const changeMode = (next: 'video' | 'story') => {
    setMode(next);
    setLastUri(null); // video quay ở chế độ kia không dùng cho chế độ này
  };

  const startRecording = async () => {
    if (!cameraRef.current || !ready) {
      // Hẹn giờ đếm xong mà camera chưa mở xong
      Alert.alert('Camera chưa sẵn sàng', 'Đợi camera mở xong rồi bấm quay lại');
      return;
    }
    discardRef.current = false;
    setRecording(true);
    try {
      // Promise trả về khi gọi stopRecording() hoặc quay đủ maxDuration giây
      const maxDuration = isStory ? storyMaxSec : VIDEO_MAX_DURATION_SEC;
      const result = await cameraRef.current.recordAsync({ maxDuration });
      if (result?.uri && !discardRef.current) {
        setLastUri(result.uri);
        goNext(result.uri);
      }
    } catch (e) {
      Alert.alert('Không quay được video', e instanceof Error ? e.message : 'Thử lại sau');
    } finally {
      setRecording(false);
    }
  };

  // Nút quay tròn ở giữa
  const onRecordPress = () => {
    if (recording) {
      cameraRef.current?.stopRecording();
    } else if (Platform.OS === 'web') {
      // expo-camera trên web không hỗ trợ quay video
      Alert.alert('Trình duyệt chưa quay được video', 'Bấm "Tải lên" để chọn video có sẵn, hoặc dùng app trên điện thoại.');
    } else if (countdown !== null) {
      setCountdown(null); // bấm lần nữa khi đang đếm ngược = huỷ
    } else if (TIMERS[timerIndex] > 0) {
      setCountdown(TIMERS[timerIndex]);
    } else {
      startRecording();
    }
  };

  // Nút "Tiếp": đang quay thì dừng (quay xong tự sang PostVideo), đã có video thì đi tiếp
  const onNext = () => {
    if (recording) {
      cameraRef.current?.stopRecording();
    } else if (lastUri) {
      goNext(lastUri);
    } else {
      Alert.alert(isStory ? 'Chưa có story' : 'Chưa có video', 'Quay hoặc tải lên trước');
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, mediaTypes: ['videos'], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    // fileSize (byte) và duration (mili giây) có thể không có trên vài máy → bỏ qua kiểm tra
    if (asset.fileSize && asset.fileSize > VIDEO_MAX_MB * 1024 * 1024) {
      Alert.alert('Video quá lớn', `Chọn video dưới ${VIDEO_MAX_MB} MB`);
      return;
    }
    if (asset.duration && asset.duration > VIDEO_MAX_DURATION_SEC * 1000) {
      Alert.alert('Video quá dài', `Chọn video không quá ${VIDEO_MAX_DURATION_SEC} giây`);
      return;
    }
    setLastUri(asset.uri);
    goToPost(asset.uri);
  };

  // Chế độ Story: chọn ảnh hoặc video rồi sang màn Đăng story
  const pickStory = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, mediaTypes: ['images', 'videos'], quality: 0.9 });
    if (result.canceled) return;
    const asset = result.assets[0];
    navigation.navigate('StoryCreate', { uri: asset.uri, mediaType: asset.type === 'video' ? 'VIDEO' : 'IMAGE' });
  };

  const requestPermissions = async () => {
    const cam = camPermission?.granted ? camPermission : await requestCamPermission();
    const mic = micPermission?.granted ? micPermission : await requestMicPermission();
    // Người dùng đã chặn hẳn → chỉ còn cách mở Cài đặt
    if ((!cam.granted && !cam.canAskAgain) || (!mic.granted && !mic.canAskAgain)) {
      Linking.openSettings();
    }
  };

  const closeButton = (
    <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Đóng">
      <Ionicons name="close" size={28} color={colors.white} />
    </Pressable>
  );

  // Đang đọc trạng thái quyền
  if (!camPermission || !micPermission) {
    return (
      <Screen dark>
        <Loading dark />
      </Screen>
    );
  }

  // Chưa có quyền: giải thích + nút cấp quyền
  if (!camPermission.granted || !micPermission.granted) {
    return (
      <Screen dark>
        {closeButton}
        <View style={styles.permission}>
          <Ionicons name="videocam-outline" size={56} color={colors.white} />
          <AppText weight="bold" size={18} color={colors.white} align="center">Cho phép dùng camera và micro</AppText>
          <AppText size={14} color={colors.border} align="center">Cần quyền camera và micro để quay video.</AppText>
          <Button title="Cấp quyền" onPress={requestPermissions} style={styles.permissionBtn} />
          <Button
            title={isStory ? 'Chọn ảnh / video' : 'Tải video lên'}
            variant="secondary"
            icon="images-outline"
            onPress={isStory ? pickStory : pickVideo}
            style={styles.permissionBtn}
          />
        </View>
      </Screen>
    );
  }

  const busy = recording || countdown !== null;
  const timerLabel = TIMER_LABELS[timerIndex];

  return (
    <Screen dark edges={[]}>
      <View style={styles.root}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          mode="video"
          facing={facing}
          enableTorch={flashOn && facing === 'back'}
          active={cameraActive}
          onCameraReady={() => setReady(true)}
          onMountError={(e) => Alert.alert('Không mở được camera', e.message)}
        />
        {!isStory && <FilterOverlay name={filter} />}
        <LinearGradient colors={['transparent', SHADE_COLOR]} style={styles.bottomShade} pointerEvents="none" />

        {/* Thanh trên: Đóng + chọn nhạc */}
        <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
          {closeButton}
          {/* Story chọn nhạc ở màn Đăng story nên ẩn nút này */}
          {!isStory && (
            <Pressable
              onPress={() => navigation.navigate('Music', { current: audio?.id })}
              disabled={busy}
              style={styles.musicPill}
              accessibilityRole="button"
            >
              <Ionicons name="musical-notes" size={15} color={colors.white} />
              <AppText weight="semibold" size={14} color={colors.white} numberOfLines={1} style={styles.musicText}>
                {audio ? audio.title : 'Thêm nhạc'}
              </AppText>
            </Pressable>
          )}
          <View style={styles.iconBtn} />
        </View>

        {/* Cột công cụ bên phải */}
        <View style={[styles.tools, { top: insets.top + 70 }]}>
          <ToolButton
            icon="camera-reverse-outline"
            label={facing === 'back' ? 'Cam sau' : 'Cam trước'}
            accessibilityLabel="Đổi camera"
            disabled={recording}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          />
          {!isStory && (
            <ToolButton
              icon="options-outline"
              label={filter ?? 'Bộ lọc'}
              accessibilityLabel="Bộ lọc"
              disabled={busy}
              onPress={() => navigation.navigate('Filter', { current: filter })}
            />
          )}
          <ToolButton
            icon="timer-outline"
            label={timerLabel}
            accessibilityLabel={`Hẹn giờ: ${timerLabel}`}
            disabled={busy}
            onPress={() => setTimerIndex((i) => (i + 1) % TIMERS.length)}
          />
          <ToolButton
            icon={flashOn ? 'flash' : 'flash-outline'}
            label={flashOn ? 'Flash bật' : 'Flash'}
            accessibilityLabel="Đèn flash"
            color={flashOn ? FLASH_ON_COLOR : colors.white}
            onPress={() => setFlashOn((f) => !f)}
          />
        </View>

        {/* Số đếm ngược to giữa màn */}
        {countdown !== null && (
          <View style={styles.countdown} pointerEvents="none">
            <AppText weight="bold" size={96} color={colors.white} style={styles.shadow}>{countdown}</AppText>
          </View>
        )}

        {/* Phần dưới: trạng thái quay, nút quay, thanh chế độ */}
        <View style={[styles.bottom, { bottom: insets.bottom + spacing.lg }]}>
          {recording ? (
            <View style={styles.recBadge} accessibilityLiveRegion="polite">
              <View style={styles.recDot} />
              <AppText weight="semibold" size={13} color={colors.white}>{isStory ? `Đang quay ${clock(elapsed)} / ${clock(storyMaxSec)}` : `Đang quay ${clock(elapsed)}`}</AppText>
            </View>
          ) : (
            <View style={styles.recBadgeSpace} />
          )}

          <View style={styles.controls}>
            <Pressable onPress={isStory ? pickStory : pickVideo} disabled={busy} style={styles.sideAction} accessibilityRole="button">
              <View style={styles.uploadThumb}>
                <Ionicons name="images-outline" size={20} color={colors.white} />
              </View>
              <AppText size={12} color={colors.white}>Tải lên</AppText>
            </Pressable>

            <Pressable
              onPress={onRecordPress}
              style={styles.recordOuter}
              accessibilityRole="button"
              accessibilityLabel={recording ? 'Dừng quay' : countdown !== null ? 'Huỷ hẹn giờ' : 'Bắt đầu quay'}
              accessibilityState={{ selected: recording }}
            >
              <View style={recording ? styles.recordInnerOn : styles.recordInner} />
            </Pressable>

            <Pressable onPress={onNext} style={styles.sideAction} accessibilityRole="button">
              <View style={styles.nextCircle}>
                <Ionicons name="checkmark" size={22} color={colors.white} />
              </View>
              <AppText size={12} color={colors.white}>Tiếp</AppText>
            </Pressable>
          </View>

          <View style={styles.modes} accessibilityLabel="Chế độ">
            <Pressable
              onPress={() => changeMode('video')}
              disabled={busy}
              style={[styles.mode, !isStory && styles.modeActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: !isStory }}
            >
              <AppText weight="semibold" size={14} color={colors.white} style={isStory && styles.modeIdle}>Video</AppText>
            </Pressable>
            <Pressable
              onPress={() => changeMode('story')}
              disabled={busy}
              style={[styles.mode, isStory && styles.modeActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isStory }}
            >
              <AppText weight="semibold" size={14} color={colors.white} style={!isStory && styles.modeIdle}>Story</AppText>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('GoLive')} disabled={busy} style={styles.mode} accessibilityRole="button">
              <AppText weight="semibold" size={14} color={colors.white} style={styles.modeIdle}>LIVE</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

/** 1 nút trong cột công cụ bên phải: icon + chữ nhỏ */
function ToolButton({
  icon,
  label,
  accessibilityLabel,
  onPress,
  disabled,
  color = colors.white,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.tool, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={24} color={color} style={styles.shadow} />
      <AppText weight="medium" size={11} color={color} numberOfLines={1} style={styles.shadow}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 260 },
  topBar: { position: 'absolute', left: spacing.sm, right: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  musicPill: {
    height: 36,
    maxWidth: 220,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.overlay,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musicText: { flexShrink: 1 },
  tools: { position: 'absolute', right: 10, gap: 10, alignItems: 'center' },
  tool: { width: 60, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  disabled: { opacity: 0.5 },
  shadow: { textShadowColor: TEXT_SHADOW_COLOR, textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  countdown: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 18 },
  recBadge: { height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.live, flexDirection: 'row', alignItems: 'center', gap: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  recBadgeSpace: { height: 28 },
  controls: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  sideAction: { width: 64, alignItems: 'center', gap: 4 },
  uploadThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  recordOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: RECORD_RING_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.live },
  recordInnerOn: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.live },
  modes: { flexDirection: 'row', gap: 6 },
  mode: { height: 36, paddingHorizontal: 10, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  modeActive: { borderBottomColor: colors.white },
  modeIdle: { opacity: 0.8 },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  permissionBtn: { alignSelf: 'stretch' },
});
