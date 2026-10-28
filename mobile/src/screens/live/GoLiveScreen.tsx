/**
 * Phát live — UC13
 * Phụ trách: Thanh
 *
 * Chuẩn bị buổi live: chọn video phát lặp (R12), nhập tiêu đề, ghim sản phẩm (không bắt buộc).
 * Bấm "Bắt đầu live" → tạo live trên backend → thay màn này bằng LiveHost.
 * Mở màn mà còn 1 buổi live cũ đang phát (app bị tắt giữa chừng) → hỏi tiếp tục hay kết thúc.
 */
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, EmptyView, ErrorView, Header, Loading, Screen, TextField } from '../../components';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/catalog';
import { liveApi } from '../../api/lives';
import { getErrorMessage } from '../../api/client';
import { useFetch } from '../../hooks/useFetch';
import { mediaUrl } from '../../utils/media';
import type { RootScreenProps } from '../../navigation/types';

const TITLE_MAX = 100;

export default function GoLiveScreen({ navigation }: RootScreenProps<'GoLive'>) {
  const { user } = useAuth();

  // Video đã đăng của chính mình, để chọn làm nguồn phát
  const { data, loading, error, reload } = useFetch(() => userApi.videos(user!.id, 0, 30), [user?.id]);
  const videos = data?.content ?? [];

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [hasProduct, setHasProduct] = useState(false);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Còn buổi live cũ của mình đang phát? → cho chọn tiếp tục hoặc kết thúc nó
  useEffect(() => {
    if (!user) return;
    let alive = true;
    liveApi
      .active()
      .then((list) => {
        const mine = list.find((l) => l.host.id === user.id);
        if (!alive || !mine) return;
        Alert.alert('Bạn đang có buổi live', `"${mine.title}" vẫn đang phát.`, [
          { text: 'Tiếp tục live', onPress: () => navigation.replace('LiveHost', { liveId: mine.id }) },
          {
            text: 'Kết thúc live cũ',
            style: 'destructive',
            onPress: () => {
              liveApi.end(mine.id).catch((e) => Alert.alert('Không kết thúc được live', getErrorMessage(e)));
            },
          },
        ]);
      })
      .catch(() => {}); // lỗi thì bỏ qua, vẫn tạo live mới được
    return () => {
      alive = false;
    };
  }, [user, navigation]);

  // Tải xong thì chọn sẵn video đầu tiên (giống design)
  useEffect(() => {
    if (selectedId === null && videos.length > 0) setSelectedId(videos[0].id);
  }, [videos, selectedId]);

  const onStart = async () => {
    if (!title.trim()) {
      setTitleError('Nhập tiêu đề buổi live');
      return;
    }
    if (selectedId === null) {
      Alert.alert('Thông báo', 'Chọn một video để phát lặp trong buổi live');
      return;
    }
    const source = videos.find((v) => v.id === selectedId);
    // Giá nhập "199.000" → 199000
    const price = Number(productPrice.replace(/\D/g, '')) || 0;

    setSubmitting(true);
    try {
      const live = await liveApi.create({
        title: title.trim(),
        sourceVideoId: selectedId,
        ...(hasProduct && productName.trim()
          ? { productName: productName.trim(), productPrice: price, productImageUrl: source?.thumbnailUrl ?? undefined }
          : {}),
      });
      // replace: bấm quay lại ở LiveHost không về màn chuẩn bị nữa
      navigation.replace('LiveHost', { liveId: live.id });
    } catch (e) {
      Alert.alert('Không phát được live', getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const renderVideos = () => {
    if (loading) return <Loading />;
    if (error) return <ErrorView message={error} onRetry={reload} />;
    if (videos.length === 0) {
      return <EmptyView icon="videocam-outline" title="Chưa có video nào" message="Đăng ít nhất một video để phát live" />;
    }
    return (
      <View style={styles.grid}>
        {videos.map((v) => {
          const on = v.id === selectedId;
          return (
            <Pressable
              key={v.id}
              onPress={() => setSelectedId(v.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={v.title}
              style={[styles.thumb, on && styles.thumbOn]}
            >
              {v.thumbnailUrl ? (
                <Image source={{ uri: mediaUrl(v.thumbnailUrl) }} style={styles.thumbImg} />
              ) : (
                <View style={[styles.thumbImg, styles.thumbEmpty]}>
                  <Ionicons name="videocam-outline" size={26} color={colors.muted} />
                </View>
              )}
              {on && (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                </View>
              )}
              <AppText weight="semibold" size={11} color={colors.white} numberOfLines={1} style={styles.thumbLabel}>
                {v.title}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <Screen>
      <Header title="Phát live" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {/* Chọn video nguồn */}
          <View>
            <AppText weight="semibold" size={13}>
              Video phát<AppText color={colors.danger}> *</AppText>
            </AppText>
            <AppText size={12} color={colors.muted} style={styles.hint}>Video sẽ phát lặp trong buổi live</AppText>
            {renderVideos()}
          </View>

          <TextField
            label="Tiêu đề"
            required
            maxLength={TITLE_MAX}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setTitleError(null);
            }}
            error={titleError}
          />

          {/* Sản phẩm ghim (không bắt buộc) */}
          {hasProduct ? (
            <View style={styles.productBox}>
              <AppText weight="semibold" size={13}>Sản phẩm ghim</AppText>
              <View style={styles.productRow}>
                <View style={styles.flex}>
                  <TextField label="Tên" showCounter={false} value={productName} onChangeText={setProductName} />
                </View>
                <View style={styles.priceCol}>
                  <TextField label="Giá (đ)" showCounter={false} keyboardType="numeric" value={productPrice} onChangeText={setProductPrice} />
                </View>
              </View>
              <Pressable onPress={() => setHasProduct(false)} accessibilityRole="button" style={styles.removeBtn}>
                <AppText weight="semibold" size={13} color={colors.danger}>Bỏ sản phẩm</AppText>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setHasProduct(true)} accessibilityRole="button" style={styles.addProduct}>
              <Ionicons name="add" size={18} color={colors.muted} />
              <AppText size={14} color={colors.muted}>Ghim sản phẩm (không bắt buộc)</AppText>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Bắt đầu live" icon="radio-button-on" onPress={onStart} loading={submitting} style={styles.startBtn} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: 18 },
  hint: { marginTop: 2, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: '31.5%', height: 150, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 3, borderColor: 'transparent' },
  thumbOn: { borderColor: colors.primary },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  thumbLabel: { position: 'absolute', left: 6, right: 6, bottom: 6, textShadowColor: colors.overlay, textShadowRadius: 2 },
  addProduct: { height: 52, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  productBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, gap: 10 },
  productRow: { flexDirection: 'row', gap: 10 },
  priceCol: { width: 120 },
  removeBtn: { alignSelf: 'flex-start', height: 36, justifyContent: 'center' },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 34 },
  startBtn: { backgroundColor: colors.live, borderColor: colors.live, height: 54 },
});
