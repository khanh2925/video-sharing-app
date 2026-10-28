/**
 * Màn hình tạm — chỉ để app chạy được và điều hướng thử.
 * Ai làm màn nào thì XOÁ dòng dùng PlaceholderScreen trong file màn đó và viết giao diện thật.
 */
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { AppText } from './AppText';
import { Header } from './Header';
import { Screen } from './Screen';

interface Props {
  title: string;
  owner: 'Khánh' | 'Thanh' | 'Long';
  useCase: string;
  showBack?: boolean;
}

export function PlaceholderScreen({ title, owner, useCase, showBack = true }: Props) {
  return (
    <Screen>
      <Header title={title} showBack={showBack} />
      <View style={styles.center}>
        <Ionicons name="construct-outline" size={44} color={colors.placeholder} />
        <AppText weight="semibold">Màn hình đang làm</AppText>
        <AppText size={13} color={colors.muted}>{`${useCase} · Phụ trách: ${owner}`}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
