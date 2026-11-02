/**
 * Cấu hình hệ thống — UC19 (chỉ ADMIN).
 * - 3 thông số trong bảng system_settings (GET /api/admin/settings), mỗi thông số một ô sửa số kèm đơn vị.
 * - Kiểm tra trên app: số nguyên lớn hơn 0. Backend kiểm tra thêm (vd dung lượng video không vượt trần upload).
 * - "Lưu" chỉ gửi thông số đã đổi (PUT /api/admin/settings/{key}), có hiệu lực ngay, không phải chạy lại server.
 * - Rời màn khi còn thay đổi chưa lưu → hỏi xác nhận.
 */
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, ErrorView, Header, Loading, Screen, TextField } from '../../components';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { colors, radius, spacing } from '../../constants/theme';
import { confirmAsync } from '../../utils/confirm';
import { timeAgo } from '../../utils/format';
import type { AdminSetting, SettingKey } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

/** Tên và đơn vị hiển thị cho từng thông số */
const META: Record<SettingKey, { label: string; unit: string }> = {
  VIDEO_MAX_SIZE_MB: { label: 'Dung lượng video tối đa', unit: 'MB' },
  STORY_MAX_DURATION_SEC: { label: 'Độ dài story video tối đa', unit: 'giây' },
  STORY_LIFETIME_HOURS: { label: 'Thời gian tồn tại của story', unit: 'giờ' },
};

const isPositiveInt = (s: string) => /^\d+$/.test(s.trim()) && Number(s) > 0;

export default function AdminSettingsScreen({ navigation }: RootScreenProps<'AdminSettings'>) {
  const settings = useFetch(() => adminApi.settings(), []);
  const [values, setValues] = useState<Partial<Record<SettingKey, string>>>({});
  const [saving, setSaving] = useState(false);

  const original = (key: SettingKey) => settings.data?.find((s) => s.key === key)?.value ?? '';
  const changed = (settings.data ?? []).filter((s) => values[s.key] !== undefined && values[s.key] !== s.value);
  const invalid = changed.some((s) => !isPositiveInt(values[s.key] ?? ''));

  // Còn thay đổi chưa lưu mà bấm lùi → hỏi trước
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (changed.length === 0 || saving) return;
      e.preventDefault();
      confirmAsync('Bỏ thay đổi?', 'Các thông số chưa lưu sẽ mất.', 'Bỏ thay đổi').then((ok) => {
        if (ok) navigation.dispatch(e.data.action);
      });
    });
    return unsubscribe;
  }, [navigation, changed.length, saving]);

  const save = async () => {
    if (changed.length === 0 || invalid) return;
    setSaving(true);
    try {
      const updated: AdminSetting[] = [];
      for (const s of changed) updated.push(await adminApi.updateSetting(s.key, (values[s.key] ?? '').trim()));
      settings.setData((list) => (list ?? []).map((s) => updated.find((u) => u.key === s.key) ?? s));
      setValues({});
      Alert.alert('Đã lưu', 'Thông số mới có hiệu lực ngay.');
    } catch (e) {
      Alert.alert('Lưu thất bại', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (settings.loading) return <Loading />;
  if (settings.error || !settings.data) {
    return (
      <Screen>
        <Header title="Cấu hình hệ thống" />
        <ErrorView message={settings.error ?? 'Không tải được thông số'} onRetry={settings.reload} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Cấu hình hệ thống" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText size={13} color={colors.muted} style={styles.note}>
            Thông số đổi xong có hiệu lực ngay cho mọi người dùng, không phải sửa code hay chạy lại server.
          </AppText>
          {settings.data.map((s) => {
            const meta = META[s.key] ?? { label: s.key, unit: '' };
            const value = values[s.key] ?? s.value;
            const bad = values[s.key] !== undefined && !isPositiveInt(value);
            return (
              <View key={s.key} style={styles.card}>
                <TextField
                  label={`${meta.label} (${meta.unit})`}
                  value={value}
                  onChangeText={(t) => setValues((v) => ({ ...v, [s.key]: t.replace(/[^\d]/g, '') }))}
                  keyboardType="number-pad"
                  maxLength={6}
                  showCounter={false}
                  error={bad ? 'Nhập số nguyên lớn hơn 0' : undefined}
                />
                <AppText size={12} color={colors.muted}>{s.description}</AppText>
                <AppText size={12} color={colors.muted}>
                  Mã: {s.key}{s.updatedAt ? ` · Sửa lần cuối ${timeAgo(s.updatedAt)}` : ''}
                  {values[s.key] !== undefined && values[s.key] !== original(s.key) ? ` · Cũ: ${original(s.key)}` : ''}
                </AppText>
              </View>
            );
          })}
          <Button
            title={changed.length > 0 ? `Lưu (${changed.length})` : 'Lưu'}
            onPress={save}
            loading={saving}
            disabled={changed.length === 0 || invalid}
            style={styles.save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 40, gap: spacing.lg },
  note: { marginBottom: spacing.xs },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 4 },
  save: { marginTop: spacing.sm },
});
