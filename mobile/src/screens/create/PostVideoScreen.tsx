/**
 * Đăng video — UC08
 * Phụ trách: Khánh
 *
 * Nhận { videoUri, filter, audio } từ Camera. Bộ lọc và nhạc đổi lại được ở đây
 * (Filter / Music gửi về bằng navigate + merge, nên đọc thẳng từ route.params).
 * "Lưu nháp" và "Đăng" cùng gọi POST /api/videos (multipart), khác nhau ở field draft.
 * Rời màn khi chưa đăng thì hỏi: Lưu nháp / Bỏ video / Ở lại.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Button, Chip, ComingSoonBadge, EmptyView, Header, Screen, SegmentedTabs, TextField } from '../../components';
import { videoApi } from '../../api/videos';
import { catalogApi } from '../../api/catalog';
import { getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { useBackgroundMusic } from '../../hooks/useBackgroundMusic';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { formatDuration, visibilityLabel } from '../../utils/format';
import { fileFromUri } from '../../utils/media';
import type { Visibility } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';
import { FilterOverlay } from './FilterScreen';

const TITLE_MAX = 150;
const DESC_MAX = 2000;
const VISIBILITY_TABS = (Object.keys(visibilityLabel) as Visibility[]).map((key) => ({ key, label: visibilityLabel[key] }));

/** Chuẩn hoá hashtag: bỏ dấu #, bỏ khoảng trắng, viết thường */
const normalizeTag = (raw: string) => raw.trim().replace(/^#+/, '').replace(/\s+/g, '').toLowerCase();

export default function PostVideoScreen({ navigation, route }: RootScreenProps<'PostVideo'>) {
  const videoUri = route.params?.videoUri;
  const filter = route.params?.filter;
  const audio = route.params?.audio;

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [topicId, setTopicId] = useState<number | undefined>();
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [allowComments, setAllowComments] = useState(true);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [uploading, setUploading] = useState<'draft' | 'post' | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const topics = useFetch(() => catalogApi.topics(), []);

  // Xem trước video: tự phát, lặp lại, tắt tiếng
  const player = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  // Nghe thử nhạc đã chọn khi đang ở màn này (mở Music / Filter, rời màn thì dừng)
  const isFocused = useIsFocused();
  useBackgroundMusic(audio?.fileUrl, isFocused && !uploading);

  useEffect(() => {
    const sub = player.addListener('sourceLoad', (e) => setDuration(e.duration));
    return () => sub.remove();
  }, [player]);

  // Đang hiện ảnh bìa (video bị che) hoặc rời màn thì dừng video xem trước cho đỡ tốn pin
  useEffect(() => {
    if (coverUri || !isFocused) player.pause();
    else player.play();
  }, [coverUri, isFocused, player]);

  // Đăng xong / bấm "Bỏ video" thì cho rời màn, không hỏi nữa
  const allowLeaveRef = useRef(false);
  const submitRef = useRef<(draft: boolean) => void>(() => {});
  // Listener beforeRemove đọc ref này để biết đang tải lên hay không
  const uploadingRef = useRef(false);
  uploadingRef.current = !!uploading;

  // Rời màn khi chưa đăng → hỏi (bắt cả nút back, vuốt, nút back Android)
  useEffect(() => {
    if (!videoUri) return;
    return navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current) return;
      e.preventDefault();
      // Đang tải lên thì chặn rời màn, không hỏi gì (tải xong màn tự chuyển)
      if (uploadingRef.current) return;
      Alert.alert('Thoát mà chưa đăng?', undefined, [
        { text: 'Lưu nháp', onPress: () => submitRef.current(true) },
        {
          text: 'Bỏ video',
          style: 'destructive',
          onPress: () => {
            allowLeaveRef.current = true;
            navigation.dispatch(e.data.action);
          },
        },
        { text: 'Ở lại', style: 'cancel' },
      ]);
    });
  }, [navigation, videoUri]);

  const titleError = triedSubmit && !title.trim() ? 'Nhập tiêu đề để đăng' : null;

  // Thêm hashtag: bỏ dấu #, viết thường, không trùng. Trả về danh sách mới để submit dùng luôn
  const addTag = () => {
    const tag = normalizeTag(tagDraft);
    const next = tag && !tags.includes(tag) ? [...tags, tag] : tags;
    if (next !== tags) setTags(next);
    setTagDraft('');
    return next;
  };

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.8 });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const comingSoon = () => Alert.alert('Thông báo', 'Tính năng sẽ có ở phiên bản sau');

  // Gửi lên máy chủ. draft = true → lưu nháp, false → đăng luôn
  const submit = async (draft: boolean) => {
    if (!videoUri || uploading) return;
    setTriedSubmit(true);
    // Chữ hashtag đang gõ dở (chưa nhấn Enter) cũng được thêm vào
    const finalTags = tagDraft.trim() ? addTag() : tags;
    if (!title.trim()) return;
    setUploading(draft ? 'draft' : 'post');
    try {
      await videoApi.create({
        file: fileFromUri(videoUri),
        thumbnail: coverUri ? fileFromUri(coverUri) : undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        hashtags: finalTags.length ? finalTags.join(' ') : undefined,
        topicId,
        audioId: audio?.id,
        filter,
        visibility,
        allowComments,
        draft,
      });
      allowLeaveRef.current = true;
      if (draft) {
        // Bỏ Camera + PostVideo khỏi stack, mở danh sách nháp phía trên tab Hồ sơ
        navigation.reset({
          index: 1,
          routes: [{ name: 'MainTabs', params: { screen: 'MyProfile' } }, { name: 'Drafts' }],
        });
      } else {
        navigation.popTo('MainTabs', { screen: 'MyProfile' });
      }
    } catch (e) {
      Alert.alert(draft ? 'Lưu nháp thất bại' : 'Đăng video thất bại', getErrorMessage(e));
    } finally {
      setUploading(null);
    }
  };
  submitRef.current = submit;

  // Vào thẳng màn mà không có video (hiếm khi xảy ra)
  if (!videoUri) {
    return (
      <Screen>
        <Header title="Đăng video" />
        <EmptyView icon="videocam-outline" title="Chưa có video" message="Quay hoặc tải lên một video trước" />
        <Button title="Quay video" onPress={() => navigation.navigate('Camera')} style={styles.emptyBtn} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Đăng video" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Xem trước + bộ lọc, nhạc */}
          <View style={styles.topRow}>
            <View style={styles.preview}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} accessibilityLabel="Ảnh bìa video" />
              ) : (
                <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
              )}
              <FilterOverlay name={filter} />
              <Pressable onPress={pickCover} style={styles.coverBtn} accessibilityRole="button">
                <AppText weight="semibold" size={12} color={colors.white}>Đổi ảnh bìa</AppText>
              </Pressable>
            </View>
            <View style={styles.options}>
              <OptionRow
                icon="options-outline"
                label="Bộ lọc"
                value={filter ?? 'Không lọc'}
                onPress={() => navigation.navigate('Filter', { videoUri, current: filter })}
              />
              <OptionRow
                icon="musical-notes-outline"
                label="Nhạc"
                value={audio?.title ?? 'Chưa chọn'}
                onPress={() => navigation.navigate('Music', { current: audio?.id })}
              />
              {duration !== null && (
                <AppText size={12} color={colors.muted} style={styles.meta}>{formatDuration(duration)}</AppText>
              )}
            </View>
          </View>

          <TextField
            label="Tiêu đề"
            required
            maxLength={TITLE_MAX}
            value={title}
            onChangeText={setTitle}
            error={titleError}
            returnKeyType="next"
          />
          <TextField
            label="Mô tả"
            maxLength={DESC_MAX}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* Hashtag: gõ rồi nhấn Enter để thêm thành chip */}
          <View style={styles.field}>
            <AppText weight="semibold" size={13}>Hashtag</AppText>
            <View style={styles.tagBox}>
              {tags.map((t) => (
                <Chip key={t} label={`#${t}`} tone="blue" onRemove={() => setTags(tags.filter((x) => x !== t))} />
              ))}
              <TextInput
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={() => addTag()}
                submitBehavior="submit"
                placeholder="Thêm, nhấn Enter…"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Thêm hashtag"
                style={styles.tagInput}
              />
            </View>
          </View>

          {/* Chủ đề: bấm lần nữa để bỏ chọn */}
          <View style={styles.field}>
            <AppText weight="semibold" size={13}>Chủ đề</AppText>
            {topics.loading ? (
              <ActivityIndicator color={colors.primary} style={styles.topicLoading} />
            ) : topics.error ? (
              <Pressable onPress={topics.reload} accessibilityRole="button">
                <AppText size={13} color={colors.danger}>{`${topics.error}. Chạm để thử lại`}</AppText>
              </Pressable>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicRow}>
                {(topics.data ?? []).map((t) => (
                  <Chip
                    key={t.id}
                    label={t.name}
                    selected={t.id === topicId}
                    onPress={() => setTopicId(t.id === topicId ? undefined : t.id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.field}>
            <AppText weight="semibold" size={13}>Ai được xem</AppText>
            <SegmentedTabs variant="segment" value={visibility} onChange={setVisibility} tabs={VISIBILITY_TABS} />
          </View>

          <View style={styles.switchRow}>
            <AppText weight="semibold" size={14}>Cho phép bình luận</AppText>
            <Switch
              value={allowComments}
              onValueChange={setAllowComments}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
              accessibilityLabel="Cho phép bình luận"
            />
          </View>

          {/* R16: nút ngoài MVP vẫn hiện, bấm thì báo sắp có */}
          <Pressable onPress={comingSoon} style={styles.switchRow} accessibilityRole="button">
            <AppText size={14} color={colors.muted}>Chia sẻ sang Facebook, Instagram</AppText>
            <ComingSoonBadge />
          </Pressable>

          <View style={styles.actions}>
            <Button
              title="Lưu nháp"
              variant="outline"
              icon="download-outline"
              loading={uploading === 'draft'}
              disabled={!!uploading}
              onPress={() => submit(true)}
              style={styles.actionBtn}
            />
            <Button
              title="Đăng"
              icon="paper-plane-outline"
              loading={uploading === 'post'}
              disabled={!!uploading}
              onPress={() => submit(false)}
              style={styles.actionBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Che màn khi đang tải video lên */}
      {uploading && (
        <View style={styles.uploading}>
          <View style={styles.uploadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <AppText weight="semibold" size={15}>
              {uploading === 'draft' ? 'Đang lưu nháp…' : 'Đang tải video lên…'}
            </AppText>
          </View>
        </View>
      )}
    </Screen>
  );
}

/** Hàng "Bộ lọc  Cổ điển" / "Nhạc  Chill buổi sáng" bên cạnh ảnh xem trước */
function OptionRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.optionRow} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <AppText size={13} style={styles.optionLabel}>{label}</AppText>
      <AppText weight="semibold" size={13} numberOfLines={1} style={styles.optionValue}>{value}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: 18, gap: 18 },
  emptyBtn: { marginHorizontal: spacing.xl, marginBottom: spacing.xxl },
  topRow: { flexDirection: 'row', gap: 14 },
  preview: { width: 116, height: 168, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.black },
  coverBtn: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: { flex: 1, gap: spacing.sm, minWidth: 0 },
  optionRow: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: { flexShrink: 0 },
  optionValue: { flex: 1, textAlign: 'right' },
  meta: { paddingHorizontal: 4, paddingTop: 2 },
  field: { gap: spacing.sm },
  tagBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tagInput: { flexGrow: 1, minWidth: 120, height: 32, paddingVertical: 0, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  topicLoading: { alignSelf: 'flex-start' },
  topicRow: { gap: spacing.sm },
  switchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: spacing.md, paddingTop: 6, paddingBottom: spacing.lg },
  actionBtn: { flex: 1 },
  uploading: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  uploadingBox: { backgroundColor: colors.white, borderRadius: 18, paddingVertical: spacing.xxl, paddingHorizontal: 32, alignItems: 'center', gap: spacing.md },
});
