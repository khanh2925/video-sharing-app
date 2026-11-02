package com.vsa.backend.ai.tracking;

/**
 * Loại hành vi người dùng được ghi lại (User tracking) — Thanh.
 * Mỗi loại có một trọng số khi tính sở thích (xem RecommendationService.WEIGHTS).
 */
public enum EventType {
    VIEW,       // mở xem một video
    WATCH,      // rời video sau khi xem, kèm thời gian đã xem
    SKIP,       // lướt qua nhanh (xem chưa tới 2 giây) → tín hiệu "không thích"
    LIKE,
    UNLIKE,
    COMMENT,
    SEARCH      // gõ tìm kiếm, kèm từ khoá
}
