package com.vsa.backend.controllers;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController              // lớp này trả về JSON (giống @Path bên Jersey)
@RequestMapping("/api")      // mọi API trong lớp bắt đầu bằng /api
public class HealthController {

    private final JdbcTemplate jdbc;   // công cụ chạy câu SQL

    // Spring tự "tiêm" JdbcTemplate vào qua constructor (Dependency Injection)
    public HealthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/health")   // GET http://localhost:8080/api/health
    public Map<String, Object> health() {
        String version = jdbc.queryForObject("SELECT VERSION()", String.class);
        return Map.of("status", "UP", "mysqlVersion", version);
    }
}