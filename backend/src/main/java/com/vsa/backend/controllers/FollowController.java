package com.vsa.backend.controllers;

import com.vsa.backend.dtos.response.FollowUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.services.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API theo dõi người dùng (UC12). Controller chỉ nhận request, gọi service, trả kết quả.
 *  POST   /api/users/{id}/follow      (cần token)  → 204
 *  DELETE /api/users/{id}/follow      (cần token)  → 204
 *  GET    /api/users/{id}/followers   (công khai)  → 200 + trang, ?page=0&size=20
 *  GET    /api/users/{id}/following   (công khai)  → 200 + trang, ?page=0&size=20
 *  GET    /api/users/suggestions      (cần token)  → 200 + danh sách gợi ý
 * Quyền truy cập đã khai báo sẵn trong SecurityConfig (/api/users/suggestions cần đăng nhập).
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    // ===== UC12 – Theo dõi người dùng =====

    // POST /api/users/5/follow → theo dõi an                                     USER
    @PostMapping("/{id}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void follow(@PathVariable Long id) {
        followService.follow(id);
    }

    // DELETE /api/users/5/follow → bỏ theo dõi an                                USER
    @DeleteMapping("/{id}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfollow(@PathVariable Long id) {
        followService.unfollow(id);
    }

    // GET /api/users/2/followers → ai đang theo dõi lan                         GUEST, USER
    @GetMapping("/{id}/followers")
    public PageResponse<FollowUserResponse> getFollowers(@PathVariable Long id, Pageable pageable) {
        return followService.getFollowers(id, pageable);
    }

    // GET /api/users/2/following → lan đang theo dõi ai                         GUEST, USER
    @GetMapping("/{id}/following")
    public PageResponse<FollowUserResponse> getFollowing(@PathVariable Long id, Pageable pageable) {
        return followService.getFollowing(id, pageable);
    }

    // GET /api/users/suggestions → "Suggestions for you"                         USER
    @GetMapping("/suggestions")
    public List<FollowUserResponse> getSuggestions() {
        return followService.getSuggestions();
    }
}
