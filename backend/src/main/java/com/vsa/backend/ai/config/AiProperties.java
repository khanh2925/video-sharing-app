package com.vsa.backend.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Thông số kỹ thuật phần AI, đọc từ "app.ai" trong application-ai.yaml.
 * (Key Gemini và tên model nằm ở "spring.ai" cùng file, do Spring AI tự đọc.)
 */
@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(VectorDb vectorDb) {

    /** Kết nối tới PostgreSQL + pgvector (container vector-db trong docker-compose.yml). */
    public record VectorDb(String url, String username, String password, String table, int dimensions) {
    }
}
