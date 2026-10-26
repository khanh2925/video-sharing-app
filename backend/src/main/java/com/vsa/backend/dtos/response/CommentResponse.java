package com.vsa.backend.dtos.response;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        String content,
        long likeCount,
        boolean liked,
        LocalDateTime createdAt,
        UserSummaryResponse user
) {
}
