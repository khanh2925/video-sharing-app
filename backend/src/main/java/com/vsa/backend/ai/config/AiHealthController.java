package com.vsa.backend.ai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Kiểm tra nhanh phần AI đã cấu hình đúng chưa (chỉ quản trị viên, chỉ khi chạy profile "ai").
 *   GET /api/admin/ai/health
 * Gọi Gemini 2 lần: đổi một câu thành vector, và hỏi một câu ngắn.
 * Trả {embeddingDimensions, chatReply}. Lỗi key hay mạng sẽ hiện ngay ở đây.
 */
@RestController
@Profile("ai")
@RequestMapping("/api/admin/ai")
public class AiHealthController {

    private final EmbeddingModel embeddingModel;
    private final ChatClient chatClient;

    public AiHealthController(EmbeddingModel embeddingModel, ChatClient.Builder chatClientBuilder) {
        this.embeddingModel = embeddingModel;
        this.chatClient = chatClientBuilder.build();
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        float[] vector = embeddingModel.embed("Video hướng dẫn nấu phở bò Hà Nội");
        String reply = chatClient.prompt()
                .user("Trả lời đúng một từ: xin chào")
                .call()
                .content();
        return Map.of("embeddingDimensions", vector.length, "chatReply", reply == null ? "" : reply.trim());
    }
}
