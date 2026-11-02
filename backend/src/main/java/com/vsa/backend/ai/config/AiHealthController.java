package com.vsa.backend.ai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Kiểm tra phần AI (chỉ quản trị viên, chỉ khi chạy profile "ai").
 *   GET /api/admin/ai/health            gọi AI 2 lần (đổi một câu thành vector, hỏi một câu ngắn)
 *                                       → {embeddingDimensions, chatReply}; lỗi key hay mạng hiện ngay ở đây
 *   GET /api/admin/ai/vectors?limit=20  xem kho vector, chỉ đọc, KHÔNG gọi AI
 *                                       → {count, items: [{videoId, content, dimensions}]}
 */
@RestController
@Profile("ai")
@RequestMapping("/api/admin/ai")
public class AiHealthController {

    private final EmbeddingModel embeddingModel;
    private final ChatClient chatClient;
    private final VectorDb vectorDb;

    public AiHealthController(EmbeddingModel embeddingModel, ChatClient.Builder chatClientBuilder, VectorDb vectorDb) {
        this.embeddingModel = embeddingModel;
        this.chatClient = chatClientBuilder.build();
        this.vectorDb = vectorDb;
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

    @GetMapping("/vectors")
    public Map<String, Object> vectors(@RequestParam(defaultValue = "20") int limit) {
        int n = Math.max(1, Math.min(limit, 100));
        // Tên bảng lấy từ cấu hình (app.ai.vector-db.table), không phải từ người dùng
        Long count = vectorDb.jdbc().queryForObject("SELECT count(*) FROM " + vectorDb.table(), Long.class);
        List<Map<String, Object>> items = vectorDb.jdbc().queryForList(
                "SELECT (metadata->>'videoId')::bigint AS \"videoId\", content, vector_dims(embedding) AS dimensions"
                        + " FROM " + vectorDb.table() + " ORDER BY (metadata->>'videoId')::bigint DESC LIMIT ?", n);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("count", count);
        result.put("items", items);
        return result;
    }
}
