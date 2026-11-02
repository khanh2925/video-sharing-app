package com.vsa.backend.ai.chat;

import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.VideoRepository;
import com.vsa.backend.services.SystemSettingService;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.document.Document;
import org.springframework.ai.tokenizer.JTokkitTokenCountEstimator;
import org.springframework.ai.tokenizer.TokenCountEstimator;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Trợ lý hỏi đáp (chatbot) — Long.
 * Ba kỹ thuật Spring AI:
 *  - RAG (QuestionAnswerAdvisor): trước khi hỏi Gemini, tìm 5 video gần nghĩa nhất trong kho vector
 *    và nhét vào câu hỏi, để Gemini trả lời bằng video THẬT của app thay vì bịa.
 *  - Tool calling (ChatTools): Gemini tự gọi hàm Java khi cần quy định app hay video của người hỏi.
 *  - Nhớ hội thoại: lịch sử lưu TRÊN MÁY người dùng (app gửi kèm mỗi câu hỏi), server không lưu gì,
 *    nên deploy / khởi động lại backend không mất. Giới hạn theo token (app.ai.chat-history-max-tokens):
 *    vượt thì bỏ tin cũ nhất, báo lại số tin đã bỏ (ChatReply.trimmed) để app xoá trên máy.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private static final String SYSTEM_PROMPT = """
            Bạn là trợ lý của ứng dụng chia sẻ video ngắn Video Sharing App (giống TikTok).
            Luôn trả lời bằng tiếng Việt, ngắn gọn, thân thiện, tối đa khoảng 5 câu.
            Chỉ trả lời về app và các video trong app. Câu hỏi ngoài lề thì lịch sự từ chối.
            Khi người dùng muốn tìm video: chỉ giới thiệu video có trong phần ngữ cảnh được cung cấp,
            nhắc ĐÚNG tiêu đề video. Không có video phù hợp thì nói thật là chưa có.
            Khi hỏi về quy định, giới hạn của app: gọi công cụ getAppRules, không tự đoán số.
            Khi hỏi về video của chính họ: gọi công cụ getMyVideos.
            """;

    /** Thay mẫu mặc định (tiếng Anh, bắt "không có trong ngữ cảnh thì nói không biết", chặn mất tool). */
    private static final PromptTemplate RAG_TEMPLATE = new PromptTemplate("""
            {query}

            Các video trong app có thể liên quan (mỗi video cách nhau bằng dòng trống, dòng đầu là tiêu đề):
            ---------------------
            {question_answer_context}
            ---------------------
            Nếu câu hỏi là tìm video thì chỉ dùng các video ở trên. Câu hỏi khác thì bỏ qua danh sách này.
            """);

    private final ObjectProvider<ChatClient.Builder> chatClientBuilderProvider;
    private final ObjectProvider<VectorStore> vectorStoreProvider;
    private final SystemSettingService systemSettingService;
    private final VideoRepository videoRepository;
    private final VideoMapper videoMapper;

    /** Đếm token bằng JTokkit (thư viện Spring AI dùng sẵn) */
    private final TokenCountEstimator tokenCounter = new JTokkitTokenCountEstimator();

    /** Tổng token tối đa của lịch sử gửi kèm mỗi câu hỏi (application-ai.yaml, mặc định 2000) */
    @Value("${app.ai.chat-history-max-tokens:2000}")
    private int historyMaxTokens;

    /** POST /api/chat */
    @Transactional(readOnly = true)
    public ChatReply ask(String message, List<ChatTurn> history) {
        Long me = SecurityUtils.getCurrentUserId();
        List<ChatTurn> turns = history == null ? List.of() : history;
        int trimmed = ChatHistoryTrimmer.countToDrop(turns, historyMaxTokens, tokenCounter);
        List<Message> previous = turns.subList(trimmed, turns.size()).stream()
                .map(t -> "user".equals(t.role()) ? (Message) new UserMessage(t.text()) : new AssistantMessage(t.text()))
                .toList();
        ChatClient.Builder builder;
        VectorStore store;
        try {
            builder = chatClientBuilderProvider.getIfAvailable();
            store = vectorStoreProvider.getIfAvailable();
        } catch (RuntimeException e) {
            // AI chưa bật hoặc thiếu key: Spring không tạo được bộ phận AI → báo dễ hiểu thay vì "Lỗi hệ thống"
            log.warn("Chatbot chưa sẵn sàng: {}", e.getMessage());
            builder = null;
            store = null;
        }
        if (builder == null || store == null) {
            throw ApiException.unavailable("Trợ lý AI đang tắt, thử lại sau");
        }

        ChatClientResponse response;
        try {
            response = builder.build().prompt()
                .system(SYSTEM_PROMPT)
                .messages(previous)                                       // lịch sử (đã cắt theo token)
                .user(message.trim())
                .advisors(
                        QuestionAnswerAdvisor.builder(store)
                                .searchRequest(SearchRequest.builder().topK(5).similarityThreshold(0.55).build())
                                .promptTemplate(RAG_TEMPLATE)
                                .build())
                .tools(new ChatTools(me, systemSettingService, videoRepository))
                .call()
                .chatClientResponse();
        } catch (ApiException e) {
            throw e;
        } catch (RuntimeException e) {
            // Hết lượt miễn phí (429), sai key, mất mạng... → báo dễ hiểu thay vì "Lỗi hệ thống"
            log.warn("Chatbot lỗi: {}", e.getMessage());
            throw ApiException.unavailable("Trợ lý đang bận hoặc hết lượt, thử lại sau ít phút");
        }

        String reply = response.chatResponse() == null ? "" : response.chatResponse().getResult().getOutput().getText();
        return new ChatReply(reply == null ? "" : reply.trim(), mentionedVideos(reply, response.context()), trimmed);
    }

    /** Trong các video RAG đã tìm, giữ những video có tiêu đề xuất hiện trong câu trả lời. */
    @SuppressWarnings("unchecked")
    private List<VideoResponse> mentionedVideos(String reply, Map<String, Object> context) {
        Object raw = context.get(QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS);
        if (reply == null || !(raw instanceof List<?> list) || list.isEmpty()) {
            return List.of();
        }
        String lowerReply = reply.toLowerCase(Locale.ROOT);
        List<Long> ids = ((List<Document>) list).stream()
                .filter(d -> {
                    String text = d.getText() == null ? "" : d.getText();
                    String title = text.split("\n", 2)[0].trim().toLowerCase(Locale.ROOT);
                    return !title.isEmpty() && lowerReply.contains(title);
                })
                .map(d -> ((Number) d.getMetadata().get("videoId")).longValue())
                .distinct()
                .toList();
        Map<Long, Video> byId = videoRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Video::getId, Function.identity()));
        return ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .filter(v -> v.getStatus() == VideoStatus.PUBLISHED && v.getVisibility() == Visibility.PUBLIC)
                .map(v -> videoMapper.toResponse(v, false))
                .toList();
    }
}
