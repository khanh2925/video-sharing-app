package com.vsa.backend.exceptions;

import com.vsa.backend.dtos.response.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Bắt mọi lỗi ném ra từ controller / service và trả về JSON thống nhất (NFR09). */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Lỗi nghiệp vụ do mình chủ động ném
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException e) {
        return build(e.getStatus(), e.getMessage());
    }

    // Lỗi @Valid trên DTO (vd @NotBlank, @Size): lấy thông báo của trường sai đầu tiên
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Dữ liệu không hợp lệ");
        return build(HttpStatus.BAD_REQUEST, message);
    }

    // Thiếu file trong form multipart (vd không gửi "file" khi đăng video)
    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ErrorResponse> handleMissingPart(MissingServletRequestPartException e) {
        return build(HttpStatus.BAD_REQUEST, "Thiếu dữ liệu bắt buộc: " + e.getRequestPartName());
    }

    // JSON sai cú pháp, sai kiểu (vd ?page=abc, /api/videos/abc), thiếu tham số bắt buộc trên URL.
    // Không có các dòng này thì rơi xuống handleOther → trả 500 sai bản chất.
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class})
    public ResponseEntity<ErrorResponse> handleBadInput(Exception e) {
        return build(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ");
    }

    // Sắp xếp theo thuộc tính không có (vd ?sort=abc với API nhận Pageable)
    @ExceptionHandler(PropertyReferenceException.class)
    public ResponseEntity<ErrorResponse> handleBadSort(PropertyReferenceException e) {
        return build(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ");
    }

    // Gọi đường dẫn không có API nào, hoặc file trong /files/** không tồn tại
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException e) {
        return build(HttpStatus.NOT_FOUND, "Không tìm thấy");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleFileTooLarge(MaxUploadSizeExceededException e) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "File quá lớn, vượt giới hạn cho phép");
    }

    // Vi phạm ràng buộc unique trong DB (vd thích 2 lần cùng lúc)
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException e) {
        return build(HttpStatus.CONFLICT, "Dữ liệu bị trùng hoặc vi phạm ràng buộc");
    }

    // @PreAuthorize từ chối
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException e) {
        return build(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này");
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException e) {
        return build(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập");
    }

    // Lỗi không lường trước: ghi log để sửa, không lộ chi tiết ra ngoài
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleOther(Exception e) {
        log.error("Lỗi không mong muốn", e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống, vui lòng thử lại");
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ErrorResponse.of(status.value(), message));
    }
}
