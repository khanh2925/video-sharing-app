/**
 * Thay cho <Text> của React Native: tự dùng font Be Vietnam Pro và màu chữ chuẩn.
 *   <AppText weight="bold" size={18}>Video nháp</AppText>
 *   <AppText size={12} color={colors.muted}>Vừa lưu</AppText>
 */
import { Text, TextProps } from 'react-native';
import { colors, fonts, fontSize, FontWeight } from '../constants/theme';

interface Props extends TextProps {
  weight?: FontWeight;
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function AppText({ weight = 'regular', size = fontSize.base, color = colors.text, align, style, ...rest }: Props) {
  return (
    <Text
      style={[{ fontFamily: fonts[weight], fontSize: size, color, textAlign: align, lineHeight: Math.round(size * 1.4) }, style]}
      {...rest}
    />
  );
}
