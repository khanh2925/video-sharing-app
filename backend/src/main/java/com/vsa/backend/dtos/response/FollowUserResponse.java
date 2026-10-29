package com.vsa.backend.dtos.response;

/**
 * Một dòng trong danh sách followers / following / gợi ý (UC12 – màn hình Follow).
 * following: người đang xem có đang theo dõi người này không → app hiện nút "Following" hay "Follow".
 * me: dòng này là chính người đang xem → app ẩn nút.
 */
public record FollowUserResponse(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        boolean following,
        boolean me
) {
}
