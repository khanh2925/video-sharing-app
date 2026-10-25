package com.vsa.backend.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ có mã HTTP đi kèm. Ở service chỉ cần:
 * {@code throw ApiException.conflict("Tên đăng nhập đã tồn tại");}
 * GlobalExceptionHandler sẽ đổi thành JSON {status, message, timestamp}.
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    // Mấy hàm tạo nhanh cho các lỗi hay gặp
    public static ApiException notFound(String message) {        // 404
        return new ApiException(HttpStatus.NOT_FOUND, message);
    }

    public static ApiException badRequest(String message) {      // 400
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static ApiException unauthorized(String message) {    // 401
        return new ApiException(HttpStatus.UNAUTHORIZED, message);
    }

    public static ApiException forbidden(String message) {       // 403
        return new ApiException(HttpStatus.FORBIDDEN, message);
    }

    public static ApiException conflict(String message) {        // 409
        return new ApiException(HttpStatus.CONFLICT, message);
    }
}
