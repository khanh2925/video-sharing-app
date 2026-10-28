/**
 * Đăng nhập — UC02
 * Phụ trách: Khánh
 *
 * Mở dạng modal (trượt từ dưới lên) từ bảng "Đăng nhập để tiếp tục" hoặc nút "Đăng nhập" ở Trang chủ.
 * Đăng nhập xong thì goBack() về đúng chỗ người dùng đang xem.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Screen, TextField } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import type { RootScreenProps } from '../../navigation/types';

type IconName = keyof typeof Ionicons.glyphMap;

/** 3 thẻ nghiêng trang trí ở phần đầu màn (thay cho ảnh mẫu trong thiết kế) */
const HERO_CARDS: { icon: IconName; rotate: string; style: object }[] = [
  { icon: 'heart', rotate: '-8deg', style: { left: 34, top: 70, width: 118, height: 190 } },
  { icon: 'play', rotate: '0deg', style: { left: 136, top: 42, width: 124, height: 206, zIndex: 1 } },
  { icon: 'musical-notes', rotate: '8deg', style: { left: 240, top: 74, width: 118, height: 190 } },
];

export default function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const { login } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ id?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Kiểm tra bỏ trống trước khi gọi API
  const validate = () => {
    const next: { id?: string; password?: string } = {};
    if (!usernameOrEmail.trim()) next.id = 'Nhập tên đăng nhập hoặc email';
    if (!password) next.password = 'Nhập mật khẩu';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setServerError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login({ usernameOrEmail: usernameOrEmail.trim(), password });
      navigation.goBack(); // đóng modal, quay về màn đang xem
    } catch (e) {
      setServerError(getErrorMessage(e)); // vd "Sai tên đăng nhập hoặc mật khẩu"
    } finally {
      setSubmitting(false);
    }
  };

  // Màn Đăng ký đã có trong stack (mở từ Đăng ký sang) thì quay lại, chưa có thì mở mới
  const goRegister = () => {
    const inStack = navigation.getState().routes.some((r) => r.name === 'Register');
    if (inStack) navigation.popTo('Register');
    else navigation.navigate('Register');
  };

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
          {/* Phần đầu màu hồng nhạt + 3 thẻ nghiêng */}
          <View style={styles.hero}>
            {HERO_CARDS.map((c) => (
              <View key={c.icon} style={[styles.heroCard, c.style, { transform: [{ rotate: c.rotate }] }]}>
                <Ionicons name={c.icon} size={40} color={colors.primary} />
              </View>
            ))}
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {/* Khung trắng bo góc đè lên phần đầu */}
          <View style={styles.card}>
            <AppText weight="bold" size={26}>Đăng nhập</AppText>

            <View style={styles.form}>
              <TextField
                label="Tên đăng nhập hoặc email"
                value={usernameOrEmail}
                onChangeText={(t) => {
                  setUsernameOrEmail(t);
                  if (errors.id) setErrors((e) => ({ ...e, id: undefined }));
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                error={errors.id}
              />
              <TextField
                label="Mật khẩu"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                error={errors.password}
              />

              {/* Lỗi do backend trả về */}
              {!!serverError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <AppText size={13} color={colors.danger} style={styles.flex}>{serverError}</AppText>
                </View>
              )}

              <Button title="Đăng nhập" onPress={onSubmit} loading={submitting} style={styles.submit} />
            </View>

            <View style={styles.footer}>
              <AppText size={14} color={colors.muted}>Chưa có tài khoản? </AppText>
              <Pressable onPress={goRegister} hitSlop={8} accessibilityRole="link">
                <AppText size={14} weight="bold" color={colors.primaryText}>Đăng ký</AppText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { height: 300, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  heroCard: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 44,
    left: 14,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    marginTop: -24,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 28,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  form: { gap: 14 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  submit: { marginTop: 6 },
  footer: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
