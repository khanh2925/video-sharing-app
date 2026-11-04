package com.vsa.backend.ai.trending;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDateTime;

/**
 * Bật đọc TrendingProperties và chạy tính điểm xu hướng định kỳ (@Scheduled).
 * Đặt app.trending.scheduler-enabled=false để tắt việc tự tính lại (vd khi chạy test).
 */
@Configuration
@EnableConfigurationProperties(TrendingProperties.class)
public class TrendingConfig {

    /**
     * Tác vụ định kỳ để ở lớp riêng, KHÔNG để trong TrendingScoreService: gọi refresh() từ bên ngoài thì mới đi qua
     * proxy của Spring, @Transactional mới có tác dụng (gọi this.refresh() trong cùng lớp sẽ bỏ qua transaction).
     */
    @Slf4j
    @Configuration
    @EnableScheduling
    @RequiredArgsConstructor
    @ConditionalOnProperty(name = "app.trending.scheduler-enabled", havingValue = "true", matchIfMissing = true)
    static class TrendingScheduler {

        private final TrendingScoreService trendingScoreService;

        @Scheduled(initialDelayString = "${app.trending.initial-delay:PT10S}",
                fixedDelayString = "${app.trending.refresh-interval:PT10M}")
        void refreshPeriodically() {
            try {
                int updated = trendingScoreService.refresh(LocalDateTime.now());
                log.info("Đã tính lại điểm xu hướng cho {} video", updated);
            } catch (RuntimeException e) {
                // Lỗi thì giữ điểm cũ, lần sau chạy lại; không làm sập tác vụ định kỳ
                log.warn("Không tính được điểm xu hướng: {}", e.getMessage());
            }
        }
    }
}
