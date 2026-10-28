/**
 * Chế độ khách (R3), kiểu TikTok: khách vẫn xem được mọi thứ, chỉ khi bấm thao tác ghi
 * (thả tim, bình luận, theo dõi, đăng...) mới hiện bảng "Đăng nhập để tiếp tục".
 *
 * Dùng trong màn hình:
 *   const requireAuth = useRequireAuth();
 *   const onLike = () => requireAuth(() => { ...code thả tim... });
 * Đã đăng nhập → chạy hàm luôn. Là khách → hiện bảng, không chạy hàm.
 */
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { AppText, BottomSheet, Button } from '../components';
import { colors, spacing } from '../constants/theme';

type RequireAuth = (action?: () => void) => boolean;

const LoginPromptContext = createContext<RequireAuth | null>(null);

export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);

  const requireAuth = useCallback<RequireAuth>(
    (action) => {
      if (user) {
        action?.();
        return true;
      }
      setVisible(true);
      return false;
    },
    [user],
  );

  const goTo = (screen: 'Login' | 'Register') => {
    setVisible(false);
    navigation.navigate(screen);
  };

  return (
    <LoginPromptContext.Provider value={requireAuth}>
      {children}
      <BottomSheet visible={visible} onClose={() => setVisible(false)} heightPercent={48}>
        <View style={styles.body}>
          <View style={styles.icon}>
            <Ionicons name="heart" size={30} color={colors.primary} />
          </View>
          <AppText weight="bold" size={21} align="center">Đăng nhập để tiếp tục</AppText>
          <AppText color={colors.muted} align="center" style={styles.desc}>
            Thả tim, bình luận, theo dõi người bạn thích và đăng video của riêng bạn.
          </AppText>
          <Button title="Đăng nhập" onPress={() => goTo('Login')} style={styles.full} />
          <Button title="Tạo tài khoản mới" variant="secondary" onPress={() => goTo('Register')} style={styles.full} />
          <Button title="Để sau" variant="secondary" size="sm" onPress={() => setVisible(false)} style={styles.later} />
        </View>
      </BottomSheet>
    </LoginPromptContext.Provider>
  );
}

export function useRequireAuth() {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) {
    throw new Error('useRequireAuth() phải nằm trong <LoginPromptProvider>');
  }
  return ctx;
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  desc: { lineHeight: 21, marginBottom: spacing.xs },
  full: { alignSelf: 'stretch' },
  later: { backgroundColor: 'transparent', borderColor: 'transparent' },
});
