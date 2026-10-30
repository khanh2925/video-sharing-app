/**
 * Ô nhập có nhãn, bộ đếm ký tự và dòng báo lỗi.
 *   <TextField label="Tiêu đề" required maxLength={150} value={title} onChangeText={setTitle} error={errors.title} />
 *   <TextField label="Mật khẩu" secureTextEntry ... />   → tự có nút con mắt ẩn/hiện
 * Mọi prop của TextInput (keyboardType, autoCapitalize, multiline...) đều truyền được.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../constants/theme';
import { AppText } from './AppText';

interface Props extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string | null;
  /** Hiện "14/150" bên phải nhãn (cần có maxLength) */
  showCounter?: boolean;
}

export function TextField({ label, required, error, showCounter = true, maxLength, value, secureTextEntry, multiline, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrap}>
      {(label || (showCounter && maxLength)) && (
        <View style={styles.labelRow}>
          <AppText weight="semibold" size={13}>
            {label}
            {required && <AppText color={colors.danger}> *</AppText>}
          </AppText>
          {showCounter && maxLength && !secureTextEntry && (
            <AppText size={12} color={colors.muted}>{`${value?.length ?? 0}/${maxLength}`}</AppText>
          )}
        </View>
      )}
      <View style={[styles.box, multiline && styles.boxMultiline, { borderColor, backgroundColor: focused ? colors.white : colors.surface }]}>
        <TextInput
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          secureTextEntry={secureTextEntry && hidden}
          placeholderTextColor={colors.placeholder}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <AppText size={12} color={colors.danger}>{error}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, gap: 8 },
  boxMultiline: { alignItems: 'flex-start', paddingVertical: 10 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 10 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top', paddingVertical: 0 },
});
