package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.UpdateSettingRequest;
import com.vsa.backend.dtos.response.AdminUserResponse;
import com.vsa.backend.dtos.response.SettingResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.services.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API quản trị – chỉ tài khoản ADMIN (SecurityConfig chặn sẵn /api/admin/**: chưa đăng nhập 401, USER 403).
 * Không có màn hình trong 12 màn hình thiết kế, test bằng Postman.
 *  PUT /api/admin/videos/{id}/hide     UC15 → 200 + video (status HIDDEN)
 *  PUT /api/admin/users/{id}/lock      UC16 → 200 + tài khoản (locked = true)
 *  PUT /api/admin/users/{id}/unlock    UC16 → 200 + tài khoản (locked = false)
 *  GET /api/admin/settings             UC19 → 200 + danh sách thông số
 *  PUT /api/admin/settings/{key}       UC19 → 200 + thông số đã sửa, body {"value": "30"}
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    // ===== UC15 – Kiểm duyệt video =====

    // PUT /api/admin/videos/6/hide → ẩn video 6                                    ADMIN
    @PutMapping("/videos/{id}/hide")
    public VideoResponse hideVideo(@PathVariable Long id) {
        return adminService.hideVideo(id);
    }

    // ===== UC16 – Quản lý người dùng =====

    // PUT /api/admin/users/5/lock → khoá tài khoản an                              ADMIN
    @PutMapping("/users/{id}/lock")
    public AdminUserResponse lockUser(@PathVariable Long id) {
        return adminService.lockUser(id);
    }

    // PUT /api/admin/users/5/unlock → mở khoá tài khoản an                         ADMIN
    @PutMapping("/users/{id}/unlock")
    public AdminUserResponse unlockUser(@PathVariable Long id) {
        return adminService.unlockUser(id);
    }

    // ===== UC19 – Cấu hình hệ thống =====

    // GET /api/admin/settings → khoá, giá trị, mô tả, lần sửa cuối                 ADMIN
    @GetMapping("/settings")
    public List<SettingResponse> getSettings() {
        return adminService.getSettings();
    }

    // PUT /api/admin/settings/STORY_MAX_DURATION_SEC  {"value": "30"}               ADMIN
    @PutMapping("/settings/{key}")
    public SettingResponse updateSetting(@PathVariable String key, @Valid @RequestBody UpdateSettingRequest request) {
        return adminService.updateSetting(key, request);
    }
}
