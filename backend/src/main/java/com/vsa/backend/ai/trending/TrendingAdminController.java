package com.vsa.backend.ai.trending;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/**
 * Quản trị viên xem vì sao video đứng hạng xu hướng (R, E, V, F, P của từng video) và bấm tính lại ngay.
 * /api/admin/** đã được SecurityConfig giới hạn cho vai trò ADMIN.
 *
 *  GET  /api/admin/trending?limit=20   → {calculatedAt, items: [{videoId, title, score, retention, ...}]}
 *  POST /api/admin/trending/refresh    → tính lại ngay, không chờ 10 phút
 */
@RestController
@RequestMapping("/api/admin/trending")
@RequiredArgsConstructor
public class TrendingAdminController {

    private final TrendingScoreService trendingScoreService;

    @GetMapping
    public TrendingScoreService.TrendingReport latest(@RequestParam(defaultValue = "20") int limit) {
        return trendingScoreService.latest(Math.min(limit, 100));
    }

    @PostMapping("/refresh")
    public TrendingScoreService.TrendingReport refresh(@RequestParam(defaultValue = "20") int limit) {
        trendingScoreService.refresh(LocalDateTime.now());
        return trendingScoreService.latest(Math.min(limit, 100));
    }
}
