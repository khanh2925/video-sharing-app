package com.vsa.backend.dtos.request;

import com.vsa.backend.utils.AppConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Sửa hồ sơ của mình (UC07 – nút "Edit Profile").
 * JSON: {"displayName": "Lan Nguyễn", "bio": "Mê du lịch và mèo"}
 * Gửi cả hai trường như form sửa hồ sơ; bio để trống thì xoá tiểu sử.
 * Không cho sửa tên đăng nhập, email (theo đặc tả UC07).
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
