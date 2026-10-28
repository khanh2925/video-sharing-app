/**
 * Khung ngoài cùng của mỗi màn hình: chừa tai thỏ / thanh trạng thái, nền trắng.
 *   <Screen>...</Screen>                 → màn thường
 *   <Screen dark edges={[]}>...</Screen> → màn video tràn viền (Watch, Camera, Live)
 * Muốn cuộn cả màn thì bọc ScrollView bên trong; danh sách dài thì dùng FlatList.
 */
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/theme';

interface Props {
  children: ReactNode;
  dark?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, dark = false, edges = ['top'], style }: Props) {
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: dark ? colors.black : colors.background }, style]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
