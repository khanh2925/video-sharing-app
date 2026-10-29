package com.vsa.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;

/** Quản trị viên sửa một thông số (UC19). JSON: {"value": "30"} */
public record UpdateSettingRequest(

        @NotBlank(message = "Vui lòng nhập giá trị")
        String value
) {
}
