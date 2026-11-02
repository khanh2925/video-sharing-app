package com.vsa.backend.ai.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.springframework.ai.vectorstore.pgvector.PgVectorStore.PgDistanceType.COSINE_DISTANCE;
import static org.springframework.ai.vectorstore.pgvector.PgVectorStore.PgIndexType.HNSW;

/**
 * Bật phần AI khi chạy profile "ai".
 *
 * Tạo bean VectorStore (kho vector) trên PostgreSQL + pgvector. Các phần khác chỉ cần tiêm VectorStore vào:
 *   vectorStore.add(...)               lưu vector của video (Khánh, gợi ý)
 *   vectorStore.similaritySearch(...)  tìm video gần nghĩa nhất (Khánh, Long chatbot)
 * EmbeddingModel (Gemini) do Spring AI tự tạo từ application-ai.yaml.
 *
 * Vì sao tự dựng mà không dùng starter pgvector: app đã có DataSource MySQL cho JPA.
 * Starter sẽ dùng luôn DataSource đó và tạo bảng vector trong MySQL (không chạy được).
 * Ở đây kết nối Postgres được tạo riêng và gói trong VectorDb (không phải DataSource hay JdbcTemplate),
 * nên JPA, HealthController và mọi chỗ đang dùng MySQL không bị ảnh hưởng.
 */
@Configuration
@Profile("ai")
@EnableConfigurationProperties(AiProperties.class)
public class AiConfig {

    /** Kết nối riêng tới pgvector (container vector-db). Dùng chung cho kho vector và trang quản trị. */
    @Bean
    public VectorDb vectorDb(AiProperties props) {
        AiProperties.VectorDb db = props.vectorDb();
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(db.url());
        dataSource.setUsername(db.username());
        dataSource.setPassword(db.password());
        dataSource.setPoolName("vector-db");
        dataSource.setMaximumPoolSize(5);
        return new VectorDb(new JdbcTemplate(dataSource), db.table());
    }

    @Bean
    public VectorStore vectorStore(VectorDb vectorDb, AiProperties props, EmbeddingModel embeddingModel) {
        return PgVectorStore.builder(vectorDb.jdbc(), embeddingModel)
                .vectorTableName(vectorDb.table())
                .dimensions(props.vectorDb().dimensions())
                .distanceType(COSINE_DISTANCE)   // so độ giống theo góc giữa 2 vector
                .indexType(HNSW)                 // chỉ mục tìm gần đúng, nhanh khi nhiều video
                .initializeSchema(true)          // tự cài extension vector và tạo bảng lần đầu chạy
                .build();
    }
}
