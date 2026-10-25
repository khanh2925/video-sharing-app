package com.vsa.backend.dtos.response;

import com.vsa.backend.enums.MediaType;

import java.time.LocalDateTime;

/**
 * Một story. viewed: người đang xem đã xem story này chưa (story của chính mình luôn true).
 */
public record StoryResponse(
        Long id,
        String mediaUrl,
        MediaType mediaType,
        int durationSec,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        boolean viewed
) {
}
