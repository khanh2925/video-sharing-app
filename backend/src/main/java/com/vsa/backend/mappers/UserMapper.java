package com.vsa.backend.mappers;

import com.vsa.backend.dtos.response.AuthUserResponse;
import com.vsa.backend.dtos.response.UserSummaryResponse;
import com.vsa.backend.entities.User;
import org.springframework.stereotype.Component;

/**
 * Chuyển entity User sang DTO. Không trả entity ra API (lộ passwordHash, lỗi vòng lặp quan hệ).
 * Long làm UC06 thì thêm hàm toProfileResponse(...) vào chính lớp này.
 */
@Component
public class UserMapper {

    public AuthUserResponse toAuthUserResponse(User user) {
        return new AuthUserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmail(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getCreatedAt());
    }

    /** Thông tin rút gọn để nhúng vào video, story, bình luận... */
    public UserSummaryResponse toSummary(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getAvatarUrl());
    }
}
