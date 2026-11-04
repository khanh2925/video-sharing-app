/**
 * Trợ lý AI (chatbot)
 *
 * - Hỏi bằng tiếng Việt: tìm video, hỏi quy định của app, hỏi video nào của mình nhiều lượt xem nhất.
 * - POST /api/chat trả { reply, videos }: reply có thể có **chữ đậm**, videos hiện thành thẻ bấm để xem.
 * - Lịch sử chat lưu TRÊN MÁY theo tài khoản (utils/chatHistory: AsyncStorage, web là localStorage):
 *   mở lại màn vẫn thấy tin cũ; mỗi câu hỏi gửi kèm lịch sử để trợ lý hiểu câu hỏi nối tiếp.
 *   Server giới hạn lịch sử theo token, vượt thì bỏ tin cũ nhất và báo lại → app xoá theo.
 * - Nút thùng rác ở góc phải: hỏi xác nhận (chạy cả bản web) → xoá lịch sử trên máy, về câu chào.
 * - Lỗi (vd 503 hết lượt) hiện thành 1 tin nhắn màu đỏ, không văng hộp thoại.
 * Mở từ icon ✨ ở Trang chủ, bọc trong requireAuth (API chat cần đăng nhập).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Chip, Header, Screen } from '../../components';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { aiApi } from '../../api/ai';
import { useAuth } from '../../context/AuthContext';
import { clearChatHistory, loadChatHistory, saveChatHistory, type StoredChatMessage } from '../../utils/chatHistory';
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
  text: 'Chào bạn! Mình là trợ lý LikTok. Mình có thể tìm video, trả lời về quy định của app, hoặc xem video nào của bạn nhiều lượt xem nhất.',
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
  const { user } = useAuth();
  const userId = user?.id ?? 0;                                   // màn này chỉ mở được khi đã đăng nhập
  const [history, setHistory] = useState<StoredChatMessage[]>([]); // tin đã lưu trên máy
  const [pending, setPending] = useState<ChatMessage[]>([]);       // câu đang hỏi / lỗi: hiện trên màn, không lưu
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);     // dòng báo nhỏ dưới tiêu đề, tự ẩn sau 2,5 giây
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const messages: ChatMessage[] = [WELCOME, ...history, ...pending];

  // Mở màn: đọc lịch sử đã lưu trên máy của tài khoản này
  useEffect(() => {
    let alive = true;
    loadChatHistory(userId).then((list) => {
      if (!alive) return;
      setHistory(list);
      setLoadingHistory(false);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || sending || loadingHistory) return;
    setInput('');
    const userMsg: StoredChatMessage = { id: newId(), role: 'user', text };
    setPending([userMsg]);
    setSending(true);
    try {
      const res = await aiApi.chat(text, history.map((m) => ({ role: m.role, text: m.text })));
      // Server đã bỏ `trimmed` tin cũ nhất vì vượt giới hạn token → xoá theo trên máy, rồi thêm câu hỏi + trả lời
      const next = [...history.slice(res.trimmed), userMsg, { id: newId(), role: 'bot' as const, text: res.reply, videos: res.videos }];
      setHistory(next);
      setPending([]);
      await saveChatHistory(userId, next);
      if (res.trimmed > 0) setNotice('Đã xoá bớt tin cũ để có chỗ cho tin mới');
    } catch (e) {
      // Lỗi: giữ câu hỏi + tin lỗi đỏ trên màn, không lưu vào lịch sử
      setPending([userMsg, { id: newId(), role: 'error', text: getErrorMessage(e) }]);
    } finally {
      setSending(false);
    }
  }, [sending, loadingHistory, history, userId]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  // Xoá lịch sử chat: hỏi trước, rồi xoá trên máy (server không lưu gì). Trợ lý không còn nhớ các câu trước.
  const confirmClear = async () => {
    if (sending) return;
    if (history.length === 0 && pending.length === 0) {
      setNotice('Chưa có lịch sử chat');
      return;
    }
    if (!(await confirmAsync('Xoá lịch sử chat?', 'Toàn bộ tin nhắn trên máy này sẽ bị xoá, trợ lý sẽ không nhớ các câu trước nữa.', 'Xoá'))) return;
    await clearChatHistory(userId);
    setHistory([]);
    setPending([]);
    setInput('');
    setNotice('Đã xoá lịch sử chat');
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
          <Pressable onPress={confirmClear} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Xoá lịch sử chat">
            <Ionicons name="trash-outline" size={22} color={colors.text} />
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
