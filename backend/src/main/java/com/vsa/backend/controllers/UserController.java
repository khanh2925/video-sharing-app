package com.vsa.backend.controllers;

import com.vsa.backend.dtos.response.UserProfileResponse;
import com.vsa.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API hồ sơ người dùng (UC06, UC07). Controller chỉ nhận request, gọi service, trả kết quả.
 *  GET /api/users/{id}   (công khai)  → 200 + hồ sơ, 404 nếu không có
 * Quyền truy cập: SecurityConfig đã cho mọi GET /api/** công khai, không cần sửa.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ===== UC06 – Xem hồ sơ người dùng =====

    // GET /api/users/3 → hồ sơ của minh                                   GUEST, USER
    @GetMapping("/{id}")
    public UserProfileResponse getProfile(@PathVariable Long id) {
        return userService.getProfile(id);
    }
}
