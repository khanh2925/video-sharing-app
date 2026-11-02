/**
 * Trợ lý AI (chatbot)
 *
 * - Hỏi bằng tiếng Việt: tìm video, hỏi quy định của app, hỏi video nào của mình nhiều lượt xem nhất.
 * - POST /api/chat trả { reply, videos }: reply có thể có **chữ đậm**, videos hiện thành thẻ bấm để xem.
 * - Nút làm mới ở góc phải: hỏi xác nhận (chạy cả bản web) → xoá trí nhớ hội thoại trên máy chủ (DELETE /api/chat),
 *   về câu chào và hiện dòng "Đã bắt đầu cuộc trò chuyện mới" để người dùng biết đã làm mới.
 * - Lỗi (vd 503 hết lượt) hiện thành 1 tin nhắn màu đỏ, không văng hộp thoại.
 * Mở từ icon ✨ ở Trang chủ, bọc trong requireAuth (API chat cần đăng nhập).
 */
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Chip, Header, Screen } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { aiApi } from '../../api/ai';
import { getErrorMessage } from '../../api/client';
import { confirmAsync } from '../../utils/confirm';
import { mediaUrl } from '../../utils/media';
import type { Video } from '../../types/models';
import type { RootScreenProps } from '../../navigation/types';

/** user: mình gửi · bot: trợ lý trả lời · error: lỗi khi gửi */
interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'error';
  text: string;
  videos?: Video[];
}

const MAX_LENGTH = 500;

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  text: 'Chào bạn! Mình có thể tìm video, trả lời về quy định của app, hoặc xem video nào của bạn nhiều lượt xem nhất.',
};

const SUGGESTIONS = [
  'Có video nào về du lịch Đà Lạt không?',
  'Story được đăng dài tối đa bao lâu?',
  'Video nào của tôi nhiều lượt xem nhất?',
];

let nextId = 0;
const newId = () => `m${Date.now()}-${nextId++}`;

/** "Xin **chào** bạn" → [Xin ][chào (đậm)][ bạn]. Tách theo cặp ** đơn giản, không xử lý markdown khác. */
function RichText({ text, color }: { text: string; color: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g); // phần ở vị trí lẻ là chữ nằm giữa 2 cặp **
  return (
    <AppText size={15} color={color}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <AppText key={i} weight="bold" size={15} color={color}>{part}</AppText>
        ) : (
          part
        ),
      )}
    </AppText>
  );
}

export default function ChatbotScreen({ navigation }: RootScreenProps<'Chatbot'>) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);     // dòng báo nhỏ dưới tiêu đề, tự ẩn sau 2,5 giây
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { id: newId(), role: 'user', text }]);
    setSending(true);
    try {
      const res = await aiApi.chat(text);
      setMessages((prev) => [...prev, { id: newId(), role: 'bot', text: res.reply, videos: res.videos }]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: newId(), role: 'error', text: getErrorMessage(e) }]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  // Cuộc trò chuyện mới: hỏi trước, rồi xoá trí nhớ trên máy chủ và trên màn.
  // Luôn gọi máy chủ kể cả khi màn chỉ có câu chào: trí nhớ của bot nằm trên máy chủ, còn từ lần mở trước.
  const confirmReset = async () => {
    if (resetting || sending) return;
    if (!(await confirmAsync('Cuộc trò chuyện mới', 'Xoá toàn bộ tin nhắn, trợ lý sẽ không nhớ các câu trước nữa?', 'Làm mới'))) return;
    setResetting(true);
    try {
      await aiApi.resetChat();
      setMessages([{ ...WELCOME, id: newId() }]);
      setInput('');
      setNotice('Đã bắt đầu cuộc trò chuyện mới');
    } catch (e) {
      Alert.alert('Không làm mới được', getErrorMessage(e));
    } finally {
      setResetting(false);
    }
  };

  const openVideo = (v: Video) => navigation.navigate('Watch', { videoId: v.id });

  const renderItem = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return (
        <View style={[styles.bubble, styles.userBubble]}>
          <AppText size={15} color={colors.white}>{item.text}</AppText>
        </View>
      );
    }
    if (item.role === 'error') {
      return (
        <View style={[styles.bubble, styles.errorBubble]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <AppText size={14} color={colors.danger} style={styles.flexShrink}>{item.text}</AppText>
        </View>
      );
    }
    return (
      <View style={styles.botBlock}>
        <View style={[styles.bubble, styles.botBubble]}>
          <RichText text={item.text} color={colors.text} />
        </View>
        {/* Thẻ video trợ lý gợi ý */}
        {!!item.videos?.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videoRow}>
            {item.videos.map((v) => (
              <Pressable key={v.id} style={styles.videoCard} onPress={() => openVideo(v)} accessibilityLabel={`Xem video ${v.title}`}>
                {v.thumbnailUrl ? (
                  <Image source={{ uri: mediaUrl(v.thumbnailUrl) }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.noThumb]}>
                    <Ionicons name="videocam-outline" size={24} color={colors.placeholder} />
                  </View>
                )}
                <AppText weight="semibold" size={12} numberOfLines={2}>{v.title}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {/* Câu hỏi gợi ý dưới tin chào (ẩn khi đã bắt đầu hỏi) */}
        {item.id === WELCOME.id && messages.length === 1 && (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} tone="pink" onPress={() => send(s)} />
            ))}
          </View>
        )}
      </View>
    );
  };

  const canSend = input.trim().length > 0 && !sending;

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title="Trợ lý AI"
        right={
          <Pressable onPress={confirmReset} disabled={resetting} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Cuộc trò chuyện mới">
            {resetting ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="refresh" size={22} color={colors.text} />}
          </Pressable>
        }
      />
      {!!notice && (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={16} color={colors.white} />
          <AppText size={13} color={colors.white}>{notice}</AppText>
        </View>
      )}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          // Có tin mới thì cuộn xuống cuối
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            sending ? (
              <View style={[styles.bubble, styles.botBubble, styles.typing]}>
                <ActivityIndicator size="small" color={colors.muted} />
                <AppText size={14} color={colors.muted}>Đang trả lời…</AppText>
              </View>
            ) : undefined
          }
        />

        {/* Ô nhập + nút gửi */}
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Hỏi trợ lý…"
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Nội dung câu hỏi"
            maxLength={MAX_LENGTH}
            multiline
            style={styles.input}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && styles.sendDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Gửi"
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  notice: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, backgroundColor: colors.text,
  },
  list: { padding: spacing.lg, gap: spacing.md },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  errorBubble: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.primarySoft, borderBottomLeftRadius: 4,
  },
  botBlock: { gap: spacing.sm },
  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  videoRow: { gap: spacing.sm },
  videoCard: { width: 108, gap: 6 },
  thumb: { width: 108, height: 150, borderRadius: radius.md, backgroundColor: colors.surface },
  noThumb: { alignItems: 'center', justifyContent: 'center' },
  suggestions: { gap: spacing.sm },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    fontFamily: fonts.regular, fontSize: 15, color: colors.text,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
});
