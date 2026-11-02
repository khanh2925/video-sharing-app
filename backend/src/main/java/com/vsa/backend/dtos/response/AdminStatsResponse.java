package com.vsa.backend.dtos.response;

/** Số liệu cho màn Bảng điều khiển quản trị. Video nháp không tính vào totalVideos. */
public record AdminStatsResponse(
        long totalUsers,
        long lockedUsers,
        long totalVideos,
        long publishedVideos,
        long hiddenVideos
) {
}
