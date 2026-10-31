package com.vsa.backend.dtos.response;

import com.vsa.backend.enums.Role;

import java.time.LocalDateTime;

/** Thông tin tài khoản trả về cho quản trị viên (UC16), có cờ locked. Không bao giờ có passwordHash. */
public record AdminUserResponse(
        Long id,
        String username,
        String displayName,
        String email,
        Role role,
        boolean locked,
        LocalDateTime createdAt
) {
}
