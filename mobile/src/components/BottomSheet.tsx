/**
 * Bảng trượt từ dưới lên (Bình luận, Bộ lọc, Chọn nhạc) — bọc Modal ở Buổi 6.
 *   const [open, setOpen] = useState(false);
 *   <BottomSheet visible={open} onClose={() => setOpen(false)} title="Thêm nhạc">
 *     ...nội dung...
 *   </BottomSheet>
 * Chạm vào vùng tối phía trên hoặc nút X để đóng.
 */
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { AppText } from './AppText';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Chiều cao bảng tính theo % màn hình, mặc định 65% */
  heightPercent?: number;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, title, heightPercent = 65, headerRight, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
        <View style={[styles.sheet, { height: `${heightPercent}%`, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          {(title || headerRight) && (
            <View style={styles.header}>
              <AppText weight="bold" size={18}>{title}</AppText>
              <View style={styles.headerRight}>
                {headerRight}
                <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng">
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>
            </View>
          )}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xl },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 8, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
