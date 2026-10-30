/**
 * Đăng ký — UC01
 * Phụ trách: Khánh
 *
 * Đăng ký 3 bước (kiểu TikTok):
 *   Bước 1: email → Bước 2: mật khẩu + nhập lại → Bước 3: tên đăng nhập + tên hiển thị.
 * Nút "Tiếp tục" chỉ bấm được khi bước hiện tại hợp lệ. Bước 3 gửi đủ 5 field của RegisterBody.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Screen, TextField } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import type { RootScreenProps } from '../../navigation/types';

type Step = 1 | 2 | 3;

// Quy tắc kiểm tra, khớp với validate bên backend
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,30}$/;

/** "Lan Nguyễn" → "LN", "" → "?" */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (words[0][0] + last).toUpperCase();
}

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const { register } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Điều kiện hợp lệ của từng bước
  const emailOk = EMAIL_REGEX.test(email.trim());
  const lengthOk = password.length >= 6 && password.length <= 72;
  const matchOk = confirmPassword.length > 0 && password === confirmPassword;
  const usernameOk = USERNAME_REGEX.test(username);
  const nameOk = displayName.trim().length > 0 && displayName.length <= 50;
  const valid = step === 1 ? emailOk : step === 2 ? lengthOk && matchOk : usernameOk && nameOk;

  // Nút lùi: bước 1 thì đóng màn, bước 2–3 thì về bước trước
  const onBack = () => {
    setServerError(null);
    if (step === 1) navigation.goBack();
    else setStep((s) => (s - 1) as Step);
  };

  const onNext = async () => {
    if (!valid) return;
    if (step < 3) {
      setServerError(null); // sang bước sau thì ẩn lỗi cũ
      setStep((s) => (s + 1) as Step);
      return;
    }
    setServerError(null);
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        confirmPassword,
        username: username.trim(),
        displayName: displayName.trim(),
      });
      // Chỉ đóng các màn Đăng nhập / Đăng ký ở trên cùng, quay về đúng màn đang xem trước đó
      const routes = navigation.getState().routes;
      let n = 0;
      while (n < routes.length - 1 && ['Login', 'Register'].includes(routes[routes.length - 1 - n].name)) n++;
      navigation.pop(Math.max(1, n));
    } catch (e) {
      const message = getErrorMessage(e);
      setServerError(message);
      // Lỗi về email (vd "Email đã được sử dụng") → quay về bước 1 để sửa email; lỗi tên đăng nhập thì ở lại bước 3
      if (/email/i.test(message)) setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  // Login đã nằm dưới trong stack thì quay lại, không thì thay màn này bằng Login
  const goLogin = () => {
    const inStack = navigation.getState().routes.some((r) => r.name === 'Login');
    if (inStack) navigation.popTo('Login');
    else navigation.replace('Login');
  };

  const rules = [
    { ok: lengthOk, label: 'Từ 6 đến 72 ký tự' },
    { ok: matchOk, label: 'Hai lần nhập giống nhau' },
  ];

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Thanh trên: nút lùi + thanh tiến độ 3 đoạn + "1/3" */}
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={step === 1 ? 'Quay lại' : 'Quay lại bước trước'}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View
            style={styles.progress}
            accessibilityRole="progressbar"
            accessibilityLabel="Tiến độ đăng ký"
            accessibilityValue={{ min: 1, max: 3, now: step }}
          >
            {[1, 2, 3].map((n) => (
              <View key={n} style={[styles.bar, { backgroundColor: n <= step ? colors.primary : colors.border }]} />
            ))}
          </View>
          <AppText weight="semibold" size={13} color={colors.muted} style={styles.stepText}>{`${step}/3`}</AppText>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <View style={styles.section}>
              <StepTitle title="Email của bạn là gì?" desc="Bạn có thể dùng email này hoặc tên đăng nhập để đăng nhập." />
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="tenban@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <StepTitle title="Tạo mật khẩu" desc="Đặt mật khẩu bạn dễ nhớ nhưng người khác khó đoán." />
              <TextField
                label="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <TextField
                label="Nhập lại mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
              />
              {/* Danh sách yêu cầu, tự tick xanh khi đạt */}
              <View style={styles.rules} accessibilityLabel="Yêu cầu mật khẩu">
                {rules.map((r) => (
                  <View key={r.label} style={styles.rule}>
                    <Ionicons
                      name={r.ok ? 'checkmark-circle-outline' : 'ellipse-outline'}
                      size={16}
                      color={r.ok ? colors.success : colors.muted}
                    />
                    <AppText size={13} color={r.ok ? colors.success : colors.muted}>{r.label}</AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.section}>
              <StepTitle
                title="Mọi người sẽ gọi bạn là gì?"
                desc="Tên đăng nhập là duy nhất, tên hiển thị thì đổi lúc nào cũng được."
              />
              <UsernameField value={username} onChangeText={setUsername} />
              <TextField
                label="Tên hiển thị"
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={50}
                autoComplete="name"
                textContentType="name"
              />
              {/* Xem trước hồ sơ sẽ trông thế nào */}
              <View style={styles.preview} accessibilityLabel="Xem trước hồ sơ">
                <View style={styles.previewAvatar}>
                  <AppText weight="bold" size={16} color={colors.primaryText}>{initialsOf(displayName)}</AppText>
                </View>
                <View style={styles.flex}>
                  <AppText weight="bold" numberOfLines={1}>{displayName.trim() || 'Tên hiển thị'}</AppText>
                  <AppText size={13} color={colors.muted} numberOfLines={1}>{`@${username || 'tendangnhap'}`}</AppText>
                </View>
                <AppText weight="semibold" size={11} color={colors.muted}>Xem trước</AppText>
              </View>
            </View>
          )}

          {!!serverError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <AppText size={13} color={colors.danger} style={styles.flex}>{serverError}</AppText>
            </View>
          )}

          {/* Nút dưới cùng: chưa hợp lệ thì xám, không bấm được */}
          <View style={styles.bottom}>
            <Button
              title={step === 3 ? 'Đăng ký' : 'Tiếp tục'}
              onPress={onNext}
              loading={submitting}
              disabled={!valid}
              variant={valid ? 'primary' : 'secondary'}
              style={!valid && styles.btnBlocked}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AppText size={14} color={colors.muted}>Đã có tài khoản? </AppText>
          <Pressable onPress={goLogin} hitSlop={8} accessibilityRole="link">
            <AppText size={14} weight="bold" color={colors.primaryText}>Đăng nhập</AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Tiêu đề lớn + dòng mô tả của mỗi bước */
function StepTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.titleWrap}>
      <AppText weight="bold" size={26}>{title}</AppText>
      <AppText size={14} color={colors.muted}>{desc}</AppText>
    </View>
  );
}

/** Ô tên đăng nhập có chữ "@" cố định phía trước (TextField chung không có phần này) */
function UsernameField({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <AppText weight="semibold" size={13}>Tên đăng nhập</AppText>
      <View style={[styles.prefixBox, focused && styles.prefixBoxFocused]}>
        <AppText size={16} color={colors.muted}>@</AppText>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          maxLength={30}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.prefixInput}
          accessibilityLabel="Tên đăng nhập"
        />
      </View>
      <AppText size={12} color={colors.muted}>3–30 ký tự: chữ không dấu, số, dấu chấm, gạch dưới</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  stepText: { width: 56, textAlign: 'right', paddingRight: spacing.sm },
  body: { flexGrow: 1, paddingTop: 28, paddingHorizontal: spacing.xxl },
  section: { gap: 18 },
  titleWrap: { gap: spacing.sm },
  rules: { gap: spacing.sm },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldWrap: { gap: 6 },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    gap: 2,
  },
  prefixBoxFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  prefixInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingVertical: 10 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  bottom: { marginTop: 'auto', paddingTop: spacing.xxl, paddingBottom: spacing.md },
  btnBlocked: { backgroundColor: colors.border, borderColor: colors.border, opacity: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xs, paddingBottom: 28, paddingHorizontal: spacing.xxl },
});
