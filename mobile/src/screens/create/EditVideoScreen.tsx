/**
 * Sửa video — UC10
 * Phụ trách: Khánh
 *
 * Tải video theo videoId, sửa tiêu đề / mô tả / ai được xem / cho phép bình luận.
 * Lưu → PUT /api/videos/{id} (chỉ gửi field đã đổi). Rời màn khi chưa lưu thì hỏi xác nhận.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, ErrorView, Header, Loading, Screen, SegmentedTabs, TextField } from '../../components';
import { videoApi, UpdateVideoBody } from '../../api/videos';
import { getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { colors, radius, spacing } from '../../constants/theme';
import { formatCount, visibilityLabel } from '../../utils/format';
import { mediaUrl } from '../../utils/media';
import type { Visibility } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

const TITLE_MAX = 150;
const DESC_MAX = 2000;
const VISIBILITY_TABS = (Object.keys(visibilityLabel) as Visibility[]).map((key) => ({ key, label: visibilityLabel[key] }));

export default function EditVideoScreen({ navigation, route }: RootScreenProps<'EditVideo'>) {
  const { videoId } = route.params;
  const { data: video, loading, error, reload } = useFetch(() => videoApi.getById(videoId), [videoId]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [allowComments, setAllowComments] = useState(true);
  const [triedSave, setTriedSave] = useState(false);
  const [saving, setSaving] = useState(false);

  // Có dữ liệu thì đổ vào form
  useEffect(() => {
    if (!video) return;
    setTitle(video.title);
    setDescription(video.description ?? '');
    setVisibility(video.visibility);
    setAllowComments(video.allowComments);
  }, [video]);

  // Chỉ gom các field đã đổi so với bản gốc
  const changes: UpdateVideoBody = {};
  if (video) {
    if (title.trim() !== video.title) changes.title = title.trim();
    if (description.trim() !== (video.description ?? '')) changes.description = description.trim();
    if (visibility !== video.visibility) changes.visibility = visibility;
    if (allowComments !== video.allowComments) changes.allowComments = allowComments;
  }
  const dirty = Object.keys(changes).length > 0;

  // Lưu xong thì cho rời màn mà không hỏi
  const allowLeaveRef = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Rời màn khi còn thay đổi chưa lưu → hỏi (bắt cả nút back, vuốt, nút back Android)
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !dirtyRef.current) return;
      e.preventDefault();
      Alert.alert('Bỏ thay đổi?', undefined, [
        { text: 'Tiếp tục sửa', style: 'cancel' },
        { text: 'Bỏ thay đổi', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [navigation]);

  const titleError = triedSave && !title.trim() ? 'Nhập tiêu đề' : null;

  const save = async () => {
    setTriedSave(true);
    if (!title.trim()) return;
    if (!dirty) {
      navigation.goBack();
      return;
    }
    setSaving(true);
    try {
      await videoApi.update(videoId, changes);
      allowLeaveRef.current = true;
      navigation.goBack();
    } catch (e) {
      Alert.alert('Lưu thất bại', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const renderBody = () => {
    if (loading) return <Loading />;
    if (error || !video) return <ErrorView message={error ?? 'Không tìm thấy video'} onRetry={reload} />;
    const thumb = mediaUrl(video.thumbnailUrl);
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.summary}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.noThumb]}>
                <Ionicons name="videocam-outline" size={22} color={colors.placeholder} />
              </View>
            )}
            <AppText size={13} color={colors.muted} style={styles.flex}>
              {`${formatCount(video.viewCount)} lượt xem`}
            </AppText>
          </View>

          <TextField label="Tiêu đề" required maxLength={TITLE_MAX} value={title} onChangeText={setTitle} error={titleError} />
          <TextField label="Mô tả" maxLength={DESC_MAX} value={description} onChangeText={setDescription} multiline />

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

          <Button title="Lưu" onPress={save} loading={saving} disabled={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Sửa video" />
      {renderBody()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: 18, gap: 18 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 64, height: 88, borderRadius: 10, backgroundColor: colors.surface },
  noThumb: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  field: { gap: spacing.sm },
  switchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
