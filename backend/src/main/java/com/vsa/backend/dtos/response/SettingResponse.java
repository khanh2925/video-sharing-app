package com.vsa.backend.dtos.response;

import com.vsa.backend.enums.SettingKey;

import java.time.LocalDateTime;

/** Một thông số hệ thống (UC19): khoá, giá trị, mô tả, lần sửa cuối. */
public record SettingResponse(
        SettingKey key,
        String value,
        String description,
        LocalDateTime updatedAt
) {
}
