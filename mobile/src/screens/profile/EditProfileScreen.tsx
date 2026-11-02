/**
 * Sửa hồ sơ — UC07
 * Phụ trách: Long
 *
 * Đổi ảnh đại diện, tên hiển thị (bắt buộc, tối đa 50), tiểu sử (tối đa 160).
 * Tên đăng nhập và email chỉ xem, không sửa được.
 * Đang sửa dở mà rời màn (nút lùi, vuốt, nút Back Android) → hỏi "Bỏ thay đổi?".
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Avatar, Button, Header, Screen, TextField } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/catalog';
import { getErrorMessage } from '../../api/client';
import { fileFromUri } from '../../utils/media';
import type { RootScreenProps } from '../../navigation/types';

// Khớp app.upload.image-max-size-mb trong application.yaml của backend
const AVATAR_MAX_MB = 5;

export default function EditProfileScreen({ navigation }: RootScreenProps<'EditProfile'>) {
  const { user, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarMime, setAvatarMime] = useState<string | null>(null); // kiểu ảnh vừa chọn, gửi kèm khi upload
  const [tried, setTried] = useState(false); // đã bấm Lưu ít nhất 1 lần → mới hiện lỗi
  const [saving, setSaving] = useState(false);

  // Có thay đổi so với hồ sơ hiện tại không
  const dirty =
    !!user && (displayName !== user.displayName || bio !== (user.bio ?? '') || avatarUri !== (user.avatarUrl ?? null));
  const nameOk = displayName.trim().length > 0;

  // Lưu xong thì cho rời màn luôn, không hỏi nữa
  const skipConfirm = useRef(false);

  // Chặn mọi cách rời màn khi đang sửa dở (giống ví dụ beforeRemove của React Navigation)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!dirty || skipConfirm.current) return;
      e.preventDefault();
      Alert.alert('Bỏ thay đổi?', 'Những gì bạn vừa sửa sẽ không được lưu.', [
        { text: 'Tiếp tục sửa', style: 'cancel' },
        { text: 'Bỏ thay đổi', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, dirty]);

  if (!user) return null; // màn này chỉ mở được khi đã đăng nhập

  // Chọn ảnh đại diện mới trong thư viện ảnh (cắt vuông)
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      // iPhone lưu ảnh dạng HEIC, backend chỉ nhận jpg/png/webp → nhờ iOS đổi sang JPEG
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    // Báo ngay khi chọn ảnh quá lớn (giống giới hạn image-max-size-mb của backend), không đợi bấm Lưu.
    // Điện thoại thường đã nén khi cắt ảnh nên hiếm gặp; bản web gửi nguyên file nên hay gặp hơn.
    if (asset.fileSize && asset.fileSize > AVATAR_MAX_MB * 1024 * 1024) {
      Alert.alert('Ảnh quá lớn', `Ảnh đại diện tối đa ${AVATAR_MAX_MB} MB, ảnh bạn chọn ${(asset.fileSize / 1024 / 1024).toFixed(1)} MB. Chọn ảnh khác nhé.`);
      return;
    }
    setAvatarUri(asset.uri);
    setAvatarMime(asset.mimeType ?? null);
  };

  const onSave = async () => {
    setTried(true);
    if (!nameOk) return;
    setSaving(true);
    try {
      // 1. Lưu tên + tiểu sử (bio rỗng = xoá tiểu sử)
      let updated = await userApi.updateMe({ displayName: displayName.trim(), bio: bio.trim() });
      updateUser(updated);
      // 2. Có chọn ảnh mới thì upload ảnh đại diện
      if (avatarUri && avatarUri !== (user.avatarUrl ?? null)) {
        updated = await userApi.updateAvatar(fileFromUri(avatarUri, avatarMime));
        updateUser(updated);
      }
      skipConfirm.current = true;
      navigation.goBack();
    } catch (e) {
      Alert.alert('Không lưu được', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const nameError = tried && !nameOk ? 'Nhập tên hiển thị' : null;

  return (
    <Screen>
      <Header title="Sửa hồ sơ" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Ảnh đại diện + nút máy ảnh nhỏ góc dưới phải */}
          <View style={styles.avatarSection}>
            <Pressable onPress={pickAvatar} style={styles.avatarBtn} accessibilityRole="button" accessibilityLabel="Đổi ảnh đại diện">
              <Avatar uri={avatarUri} name={displayName || user.displayName} size={104} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={16} color={colors.white} />
              </View>
            </Pressable>
            <AppText size={12} color={colors.muted}>JPG, PNG, tối đa {AVATAR_MAX_MB} MB</AppText>
          </View>

          <View style={styles.form}>
            <TextField
              label="Tên hiển thị"
              required
              maxLength={50}
              value={displayName}
              onChangeText={(t) => {
                setDisplayName(t);
                setTried(false);
              }}
              autoComplete="name"
              error={nameError}
            />
            <TextField label="Tiểu sử" maxLength={200} value={bio} onChangeText={setBio} multiline numberOfLines={3} />

            {/* Thông tin chỉ xem */}
            <View style={styles.infoBox}>
              <InfoRow label="Tên đăng nhập" value={`@${user.username}`} />
              <View style={styles.divider} />
              <InfoRow label="Email" value={user.email} />
            </View>

            <Button title="Lưu" onPress={onSave} loading={saving} style={styles.saveBtn} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Một dòng thông tin không sửa được, có icon ổ khoá */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText size={13} color={colors.muted}>{label}</AppText>
      <View style={styles.infoValue}>
        <AppText weight="semibold" size={14} numberOfLines={1}>{value}</AppText>
        <Ionicons name="lock-closed-outline" size={14} color={colors.muted} accessibilityLabel="Không sửa được" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
  avatarSection: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl, paddingHorizontal: spacing.xl, paddingBottom: 6 },
  avatarBtn: { width: 104, height: 104 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { paddingTop: 14, paddingHorizontal: spacing.xl, gap: 18 },
  infoBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 14, gap: spacing.md },
  infoValue: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.border },
  saveBtn: { marginTop: spacing.xs },
});
