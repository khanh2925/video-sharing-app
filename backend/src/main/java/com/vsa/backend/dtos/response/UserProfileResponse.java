package com.vsa.backend.dtos.response;

/**
 * Hồ sơ công khai của một người dùng (UC06 – màn hình Profile Details, My Profile).
 * KHÔNG có email, passwordHash (khác AuthUserResponse là thông tin của chính mình).
 */
public record UserProfileResponse(
        Long id,
        String username,
        String displayName,
        String bio,
        String avatarUrl,
        long followingCount,   // số người họ đang theo dõi
        long followerCount,    // số người đang theo dõi họ
        long likeCount,        // tổng lượt thích trên các video đã đăng
        boolean following,     // người đang xem có theo dõi họ không (khách, xem chính mình → false)
        boolean me             // đây là hồ sơ của chính người đang xem → app hiện "Edit Profile" thay cho "Follow"
) {
}
