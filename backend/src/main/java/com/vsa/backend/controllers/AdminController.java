package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.UpdateSettingRequest;
import com.vsa.backend.dtos.response.SettingResponse;
import com.vsa.backend.services.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API quản trị (cần token của tài khoản ADMIN, người khác nhận 403):
 *  PUT /api/admin/videos/{id}/hide      ẩn video vi phạm (UC15) → 204
 *  PUT /api/admin/users/{id}/lock       khoá tài khoản (UC16) → 204
 *  PUT /api/admin/users/{id}/unlock     mở khoá tài khoản (UC16) → 204
 *  GET /api/admin/settings              danh sách thông số hệ thống (UC19)
 *  PUT /api/admin/settings/{key}        sửa một thông số, body {"value": "30"} (UC19)
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @PutMapping("/videos/{id}/hide")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void hideVideo(@PathVariable Long id) {
        adminService.hideVideo(id);
    }

    @PutMapping("/users/{id}/lock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void lockUser(@PathVariable Long id) {
        adminService.lockUser(id);
    }

    @PutMapping("/users/{id}/unlock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlockUser(@PathVariable Long id) {
        adminService.unlockUser(id);
    }

    @GetMapping("/settings")
    public List<SettingResponse> getSettings() {
        return adminService.getSettings();
    }

    @PutMapping("/settings/{key}")
    public SettingResponse updateSetting(@PathVariable String key,
                                         @Valid @RequestBody UpdateSettingRequest request) {
        return adminService.updateSetting(key, request.value());
    }
}
