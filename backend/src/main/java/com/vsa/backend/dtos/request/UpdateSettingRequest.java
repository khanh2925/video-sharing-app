package com.vsa.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Quản trị viên đổi giá trị một thông số (UC19).
 * JSON: {"value": "30"}  – gửi dạng chuỗi giống cột setting_value; kiểm tra số nguyên dương ở service.
 */
public record UpdateSettingRequest(

        @NotBlank(message = "Vui lòng nhập giá trị")
        String value
) {
}
