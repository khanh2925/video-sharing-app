package com.vsa.backend.dtos.response;

import com.vsa.backend.enums.SettingKey;

import java.time.LocalDateTime;

/**
 * Một thông số hệ thống (UC19).
 * JSON: {"key": "STORY_MAX_DURATION_SEC", "value": "15", "description": "...", "updatedAt": "..."}
 */
public record SettingResponse(
        SettingKey key,
        String value,
        String description,
        LocalDateTime updatedAt
) {
}
