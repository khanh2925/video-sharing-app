package com.vsa.backend.dtos.response;

import java.time.LocalDateTime;

/** Định dạng lỗi thống nhất cho mọi API: {"status": 400, "message": "...", "timestamp": "..."} */
public record ErrorResponse(int status, String message, LocalDateTime timestamp) {

    public static ErrorResponse of(int status, String message) {
        return new ErrorResponse(status, message, LocalDateTime.now());
    }
}
