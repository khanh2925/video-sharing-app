package com.vsa.backend.dtos.response;

import com.vsa.backend.enums.NotificationType;

import java.time.LocalDateTime;

/**
 * Một dòng ở màn Thông báo. videoId, videoTitle, videoThumbnailUrl = null khi là thông báo theo dõi.
 * text: nội dung bình luận hoặc lời nhắn khi chia sẻ.
 */
public record NotificationResponse(
        Long id,
        NotificationType type,
        UserSummaryResponse actor,
        Long videoId,
        String videoTitle,
        String videoThumbnailUrl,
        String text,
        boolean read,
        LocalDateTime createdAt
) {
}
