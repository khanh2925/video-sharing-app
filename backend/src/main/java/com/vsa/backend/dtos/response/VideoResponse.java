package com.vsa.backend.dtos.response;

import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Một video trả ra API. Dùng chung cho mọi chỗ trả video (đăng, sửa, nháp, trang chủ, chi tiết...).
 * videoUrl, thumbnailUrl là đường dẫn "/files/...", app ghép thêm địa chỉ server phía trước.
 * liked: người đang xem đã thích video này chưa (khách luôn false).
 * topic, audio có thể null.
 */
public record VideoResponse(
        Long id,
        String title,
        String description,
        String videoUrl,
        String thumbnailUrl,
        String filter,
        Visibility visibility,
        VideoStatus status,
        boolean allowComments,
        long viewCount,
        long likeCount,
        long commentCount,
        boolean liked,
        LocalDateTime createdAt,
        UserSummaryResponse owner,
        TopicResponse topic,
        AudioResponse audio,
        List<String> hashtags
) {
}
