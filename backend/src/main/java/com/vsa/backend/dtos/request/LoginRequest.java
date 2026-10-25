package com.vsa.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Dữ liệu gửi lên khi đăng nhập (UC02).
 * usernameOrEmail: nhập tên đăng nhập hoặc email đều được (R2).
 * JSON: {"usernameOrEmail": "lan", "password": "123456"}
 */
public record LoginRequest(

        @NotBlank(message = "Vui lòng nhập tên đăng nhập hoặc email")
        String usernameOrEmail,

        @NotBlank(message = "Vui lòng nhập mật khẩu")
        String password
) {
}
