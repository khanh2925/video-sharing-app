package com.vsa.backend.dtos.response;

/**
 * Kết quả đăng ký / đăng nhập.
 * App lưu token (SecureStore) rồi gửi lại ở mọi request sau: header "Authorization: Bearer <token>".
 * JSON: {"token": "eyJ...", "user": {"id": 6, "username": "lan2", ...}}
 */
public record AuthResponse(
        String token,
        AuthUserResponse user
) {
}
