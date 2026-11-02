package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.UpdateProfileRequest;
import com.vsa.backend.dtos.response.AuthUserResponse;
import com.vsa.backend.dtos.response.FollowUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.UserProfileResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.services.FollowService;
import com.vsa.backend.services.UserService;
import com.vsa.backend.utils.PageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * API hồ sơ người dùng (UC06, UC07) và theo dõi (UC12). Controller chỉ nhận request, gọi service, trả kết quả.
 *  GET    /api/users/{id}              (công khai)  → 200 + hồ sơ, 404 nếu không có
 *  GET    /api/users/{id}/videos       (công khai)  → 200 + trang video, ?page=0&size=12
 *  GET    /api/users/{id}/liked        (công khai)  → 200 + trang video đã thích, ?page=0&size=12
 *  PUT    /api/users/me                (đăng nhập)  → 200 + thông tin mới, 400 nếu sai dữ liệu
 *  POST   /api/users/me/avatar         (đăng nhập)  → 200 + thông tin mới (multipart, field "file")
 *  POST   /api/users/{id}/follow       (đăng nhập)  → 204, 400 nếu tự theo dõi mình
 *  DELETE /api/users/{id}/follow       (đăng nhập)  → 204
 *  GET    /api/users/{id}/followers    (công khai)  → 200 + trang người theo dõi
 *  GET    /api/users/{id}/following    (công khai)  → 200 + trang người đang theo dõi
 *  GET    /api/users/suggestions       (đăng nhập)  → 200 + danh sách gợi ý, ?size=10
 *  POST   /api/users/suggestions/{id}/dismiss (đăng nhập) → 204, bấm X ẩn gợi ý, lần sau không gợi ý nữa
 * Quyền truy cập: GET công khai và /api/users/suggestions cần đăng nhập đã khai báo sẵn trong SecurityConfig;
 * POST, PUT, DELETE mặc định cần đăng nhập.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final FollowService followService;

    // ===== UC06 – Xem hồ sơ người dùng =====

    // GET /api/users/3 → hồ sơ của minh                                   GUEST, USER
    @GetMapping("/{id}")
    public UserProfileResponse getProfile(@PathVariable Long id) {
        return userService.getProfile(id);
    }

    // GET /api/users/3/videos?page=0&size=12 → tab Videos của minh       GUEST, USER
    @GetMapping("/{id}/videos")
    public PageResponse<VideoResponse> getUserVideos(@PathVariable Long id, Pageable pageable) {
        return userService.getUserVideos(id, PageUtils.clamp(pageable));      // Pageable: Spring tự đọc ?page=&size= từ URL
    }

    // GET /api/users/2/liked?page=0&size=12 → tab Liked của lan          GUEST, USER
    @GetMapping("/{id}/liked")
    public PageResponse<VideoResponse> getLikedVideos(@PathVariable Long id, Pageable pageable) {
        return userService.getLikedVideos(id, PageUtils.clamp(pageable));
    }

    // ===== UC07 – Quản lý thông tin cá nhân =====

    // PUT /api/users/me  {"displayName": "...", "bio": "..."}            USER
    @PutMapping("/me")
    public AuthUserResponse updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateMyProfile(request);
    }

    // POST /api/users/me/avatar  (form-data: file)                        USER
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AuthUserResponse updateMyAvatar(@RequestPart("file") MultipartFile file) {
        return userService.updateMyAvatar(file);
    }

    // ===== UC12 – Theo dõi =====

    // POST /api/users/3/follow → theo dõi minh                            USER
    @PostMapping("/{id}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void follow(@PathVariable Long id) {
        followService.follow(id);
    }

    // DELETE /api/users/3/follow → bỏ theo dõi minh                       USER
    @DeleteMapping("/{id}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfollow(@PathVariable Long id) {
        followService.unfollow(id);
    }

    // GET /api/users/3/followers?page=0&size=20                           GUEST, USER
    @GetMapping("/{id}/followers")
    public PageResponse<FollowUserResponse> getFollowers(@PathVariable Long id, Pageable pageable) {
        return followService.getFollowers(id, PageUtils.clamp(pageable));
    }

    // GET /api/users/3/following?page=0&size=20                           GUEST, USER
    @GetMapping("/{id}/following")
    public PageResponse<FollowUserResponse> getFollowing(@PathVariable Long id, Pageable pageable) {
        return followService.getFollowing(id, PageUtils.clamp(pageable));
    }

    // GET /api/users/suggestions?size=10                                  USER
    @GetMapping("/suggestions")
    public List<FollowUserResponse> getSuggestions(@RequestParam(defaultValue = "10") int size) {
        return followService.getSuggestions(Math.clamp(size, 1, PageUtils.MAX_PAGE_SIZE));
    }

    // POST /api/users/suggestions/5/dismiss → bấm X ẩn gợi ý an, lần sau không gợi ý nữa   USER
    @PostMapping("/suggestions/{id}/dismiss")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void dismissSuggestion(@PathVariable Long id) {
        followService.dismissSuggestion(id);
    }
}
