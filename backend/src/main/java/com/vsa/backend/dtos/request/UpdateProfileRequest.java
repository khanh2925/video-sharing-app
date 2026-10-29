package com.vsa.backend.dtos.request;

import com.vsa.backend.utils.AppConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Sửa thông tin cá nhân (UC07). Tên đăng nhập và email không đổi được.
 * JSON: {"displayName": "Quốc Khánh", "bio": "Thích quay vlog du lịch"}
 * bio gửi chuỗi rỗng "" để xoá tiểu sử.
 * Đổi ảnh đại diện là API riêng: POST /api/users/me/avatar (multipart, field "file").
 */
public record UpdateProfileRequest(

        @NotBlank(message = "Vui lòng nhập tên hiển thị")
        @Size(max = AppConstants.DISPLAY_NAME_MAX,
                message = "Tên hiển thị tối đa " + AppConstants.DISPLAY_NAME_MAX + " ký tự")
        String displayName,

        @Size(max = AppConstants.BIO_MAX,
                message = "Tiểu sử tối đa " + AppConstants.BIO_MAX + " ký tự")
        String bio
) {
}
