package com.vsa.backend.controllers;

import com.vsa.backend.dtos.response.AdminStatsResponse;
import com.vsa.backend.dtos.response.AdminUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.services.AdminDashboardService;
import com.vsa.backend.utils.PageUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API XEM cho trang quản trị trong app (chỉ ADMIN, SecurityConfig chặn sẵn /api/admin/**):
 *  GET /api/admin/stats                               số người dùng, bị khoá, video, đã ẩn
 *  GET /api/admin/videos?q=&status=ALL|PUBLISHED|HIDDEN&page=0&size=20   UC15
 *  GET /api/admin/users?q=&status=ALL|ACTIVE|LOCKED&page=0&size=20       UC16
 * Thao tác (ẩn, khoá, sửa thông số) ở AdminController.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/stats")
    public AdminStatsResponse getStats() {
        return adminDashboardService.getStats();
    }

    @GetMapping("/videos")
    public PageResponse<VideoResponse> getVideos(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminDashboardService.getVideos(q, status, PageUtils.of(page, size));
    }

    @GetMapping("/users")
    public PageResponse<AdminUserResponse> getUsers(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminDashboardService.getUsers(q, status, PageUtils.of(page, size));
    }
}
