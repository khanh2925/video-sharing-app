package com.vsa.backend.ai.config;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Kết nối tới PostgreSQL + pgvector, gói trong một lớp riêng.
 * Không đăng ký thẳng JdbcTemplate làm bean: làm vậy Spring Boot sẽ tắt JdbcTemplate tự động của MySQL.
 */
public record VectorDb(JdbcTemplate jdbc, String table) {
}
