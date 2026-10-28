package com.vsa.backend.dtos.response;

import com.vsa.backend.enums.LiveMessageType;

import java.time.LocalDateTime;

public record LiveMessageResponse(
        Long id,
        LiveMessageType type,
        String content,
        LocalDateTime createdAt,
        UserSummaryResponse sender
) {
}
