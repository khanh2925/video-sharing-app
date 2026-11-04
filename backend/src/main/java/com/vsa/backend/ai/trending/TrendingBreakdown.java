package com.vsa.backend.ai.trending;

/**
 * Điểm xu hướng của một video và các thành phần, để quản trị viên xem vì sao video đứng hạng đó.
 * R, E, V, F trong khoảng 0–1; penalty và score trên thang 0–100.
 */
public record TrendingBreakdown(
        Long videoId,
        String title,
        double score,
        double retention,
        double engagement,
        double velocity,
        double freshness,
        double penalty,
        int validViews,
        int completes,
        int skips,
        int likes,
        int comments,
        int shares) {
}
