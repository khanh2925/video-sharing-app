package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.UpdateProfileRequest;
import com.vsa.backend.dtos.response.AuthUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.UserProfileResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * API hồ sơ người dùng (UC06, UC07). Controller chỉ nhận request, gọi service, trả kết quả.
 *  GET /api/users/{id}          (công khai)  → 200 + hồ sơ, 404 nếu không có
 *  GET /api/users/{id}/videos   (công khai)  → 200 + trang video, ?page=0&size=12
 *  GET /api/users/{id}/liked    (công khai)  → 200 + trang video đã thích, ?page=0&size=12
 *  PUT  /api/users/me           (cần token)  → 200 + thông tin của tôi (JSON UpdateProfileRequest)
 *  POST /api/users/me/avatar    (cần token)  → 200 + thông tin của tôi (multipart: file)
 * Quyền truy cập: SecurityConfig đã cho mọi GET /api/** công khai, PUT/POST tự cần token, không cần sửa.
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

    // GET /api/users/3/videos?page=0&size=12 → tab Videos của minh       GUEST, USER
    @GetMapping("/{id}/videos")
    public PageResponse<VideoResponse> getUserVideos(@PathVariable Long id, Pageable pageable) {
        return userService.getUserVideos(id, pageable);      // Pageable: Spring tự đọc ?page=&size= từ URL
    }

    // GET /api/users/2/liked?page=0&size=12 → tab Liked của lan          GUEST, USER
    @GetMapping("/{id}/liked")
    public PageResponse<VideoResponse> getLikedVideos(@PathVariable Long id, Pageable pageable) {
        return userService.getLikedVideos(id, pageable);
    }

    // ===== UC07 – Quản lý thông tin cá nhân =====

    // PUT /api/users/me  {"displayName": "...", "bio": "..."} → sửa hồ sơ của tôi      USER
    @PutMapping("/me")
    public AuthUserResponse updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateMyProfile(request);
    }

    // POST /api/users/me/avatar  (form-data: file=<anh.jpg>) → đổi ảnh đại diện       USER
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AuthUserResponse updateMyAvatar(@RequestPart("file") MultipartFile file) {
        return userService.updateMyAvatar(file);
    }
}
