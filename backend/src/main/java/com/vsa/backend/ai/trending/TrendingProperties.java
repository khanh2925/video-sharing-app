package com.vsa.backend.ai.trending;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Thông số chấm điểm xu hướng, đọc từ "app.trending:" trong application.yaml.
 * Đổi hệ số → sửa application.yaml rồi chạy lại backend, không phải sửa code.
 *
 * TrendingScore = max(0, 100 × (mix.retention·R + mix.engagement·E + mix.velocity·V + mix.freshness·F) − P)
 *
 * @param windowHours      chỉ tính hành vi trong bấy nhiêu giờ gần nhất
 * @param velocityHours    V: đếm lượt xem hợp lệ trong bấy nhiêu giờ gần nhất
 * @param completeRatio    xem tới tỉ lệ này (vd 0.9 = 90%) thì tính là "xem hết"
 * @param smoothingViews   m trong làm trơn Bayes: video ít mẫu bị kéo về mức trung bình
 * @param freshnessHours   F = exp(−tuổi video theo giờ / freshnessHours)
 * @param skipPenalty      P = skipPenalty × tỉ lệ lướt qua (đã làm trơn), thang 0–100
 * @param mix              hệ số của R, E, V, F
 * @param retention        hệ số trong R
 * @param engagement       hệ số trong E
 */
@ConfigurationProperties(prefix = "app.trending")
public record TrendingProperties(
        int windowHours,
        int velocityHours,
        double completeRatio,
        double smoothingViews,
        double freshnessHours,
        double skipPenalty,
        Mix mix,
        Retention retention,
        Engagement engagement) {

    public record Mix(double retention, double engagement, double velocity, double freshness) {
    }

    /** R = completion·C + watchRatio·W */
    public record Retention(double completion, double watchRatio) {
    }

    /** E = (like·L + comment·C + share·S) / tổng hệ số. App chưa có "lưu video" nên không có B (bookmark). */
    public record Engagement(double like, double comment, double share) {
    }
}
