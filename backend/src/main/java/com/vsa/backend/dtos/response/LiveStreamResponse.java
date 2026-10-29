package com.vsa.backend.dtos.response;

import com.vsa.backend.enums.LiveStatus;

import java.time.LocalDateTime;

public record LiveStreamResponse(
        Long id,
        String title,
        String sourceVideoUrl,
        String thumbnailUrl,
        LiveStatus status,
        int viewerCount,
        String productName,
        double productPrice,
        String productImageUrl,
        LocalDateTime startedAt,
        LocalDateTime endedAt,
        UserSummaryResponse host
) {
}
