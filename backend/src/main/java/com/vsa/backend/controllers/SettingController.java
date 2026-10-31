package com.vsa.backend.controllers;

import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.services.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Thông số hệ thống cho app đọc (UC19, công khai – GET /api/** đã mở trong SecurityConfig).
 *  GET /api/settings → {"STORY_MAX_DURATION_SEC": 15, "STORY_LIFETIME_HOURS": 24, "VIDEO_MAX_SIZE_MB": 100}
 * App gọi trước khi upload video / đăng story để kiểm tra giới hạn.
 */
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingController {

    private final AdminService adminService;

    // GET /api/settings → giá trị hiện tại của các thông số                       GUEST, USER
    @GetMapping
    public Map<SettingKey, Integer> getSettings() {
        return adminService.getSettingValues();
    }
}
