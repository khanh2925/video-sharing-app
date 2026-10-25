package com.vsa.backend.dtos.response;

import com.vsa.backend.enums.Role;

import java.time.LocalDateTime;

/**
 * Thông tin của CHÍNH người đang đăng nhập (trả về sau đăng ký, đăng nhập, GET /api/auth/me).
 * Có email nên KHÔNG dùng lớp này để trả hồ sơ người khác (UC06 tạo DTO riêng, không có email).
 * Không bao giờ có passwordHash.
 */
public record AuthUserResponse(
        Long id,
        String username,
        String displayName,
        String email,
        String bio,
        String avatarUrl,
        Role role,
        LocalDateTime createdAt
) {
}
