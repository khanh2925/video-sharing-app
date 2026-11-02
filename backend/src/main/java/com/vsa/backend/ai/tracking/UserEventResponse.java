package com.vsa.backend.ai.tracking;

import java.time.LocalDateTime;

/** Một dòng nhật ký hành vi cho quản trị viên xem, kèm tên người dùng và tiêu đề video cho dễ đọc. */
public record UserEventResponse(
        Long id,
        Long userId,
        String username,        // null = khách
        EventType eventType,
        Long videoId,
        String videoTitle,      // null với SEARCH hoặc video đã xoá
        Integer watchMs,
        Integer durationMs,
        String query,
        LocalDateTime createdAt) {
}
