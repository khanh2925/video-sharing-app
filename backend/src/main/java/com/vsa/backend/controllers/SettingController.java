package com.vsa.backend.controllers;

import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.services.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.EnumMap;
import java.util.Map;

/**
 * Thông số app cần biết trước khi upload (không cần đăng nhập):
 *  GET /api/settings  → {"STORY_MAX_DURATION_SEC": 15, "STORY_LIFETIME_HOURS": 24, "VIDEO_MAX_SIZE_MB": 100}
 */
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingController {

    private final SystemSettingService systemSettingService;

    @GetMapping
    public Map<SettingKey, Integer> getSettings() {
        Map<SettingKey, Integer> result = new EnumMap<>(SettingKey.class);
        for (SettingKey key : SettingKey.values()) {
            result.put(key, systemSettingService.getInt(key));
        }
        return result;
    }
}
