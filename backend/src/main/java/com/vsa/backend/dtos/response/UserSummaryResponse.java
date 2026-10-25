package com.vsa.backend.dtos.response;

/**
 * Thông tin rút gọn của một người dùng, dùng khi nhúng vào chỗ khác
 * (người đăng video, chủ story, người bình luận...). Không có email.
 */
public record UserSummaryResponse(
        Long id,
        String username,
        String displayName,
        String avatarUrl
) {
}
