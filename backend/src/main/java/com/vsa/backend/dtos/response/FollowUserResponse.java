package com.vsa.backend.dtos.response;

/**
 * Một người trong danh sách theo dõi (UC12): tab Người theo dõi, Đang theo dõi, Gợi ý, tìm kiếm tài khoản.
 * Hai cờ tính theo NGƯỜI ĐANG XEM, để app chọn nhãn nút:
 *  following = true, followsMe = true  → "Bạn bè"
 *  following = true, followsMe = false → "Đang theo dõi"
 *  following = false, followsMe = true → "Theo dõi lại"
 *  following = false, followsMe = false → "Theo dõi"
 * Khách: cả hai cờ luôn false.
 */
public record FollowUserResponse(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        long followerCount,
        boolean following,    // người đang xem có theo dõi người này không
        boolean followsMe,    // người này có theo dõi người đang xem không
        boolean me            // chính là người đang xem (app ẩn nút theo dõi)
) {
}
