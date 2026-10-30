package com.vsa.backend.services;

import com.vsa.backend.dtos.response.SettingResponse;
import com.vsa.backend.entities.SystemSetting;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.Role;
import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Nghiệp vụ quản trị (UC15, UC16, UC19). Chỉ gọi được qua /api/admin/** (SecurityConfig chặn người không phải ADMIN).
 *  - Ẩn video vi phạm: đổi trạng thái sang HIDDEN, video không còn hiện ở trang chủ, tìm kiếm, hồ sơ.
 *  - Khoá / mở khoá tài khoản: JwtAuthFilter từ chối token của tài khoản bị khoá, AuthService chặn đăng nhập.
 *  - Xem / sửa thông số hệ thống: chuyển cho SystemSettingService.
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final SystemSettingService systemSettingService;

    // ===== UC15: Kiểm duyệt video =====

    @Transactional
    public void hideVideo(Long videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy video"));
        video.setStatus(VideoStatus.HIDDEN);
    }

    // ===== UC16: Quản lý người dùng =====

    @Transactional
    public void lockUser(Long userId) {
        User user = findUser(userId);
        if (user.getRole() == Role.ADMIN) {
            throw ApiException.badRequest("Không thể khóa tài khoản quản trị viên");
        }
        user.setLocked(true);
    }

    @Transactional
    public void unlockUser(Long userId) {
        findUser(userId).setLocked(false);
    }

    // ===== UC19: Cấu hình hệ thống =====

    public List<SettingResponse> getSettings() {
        return systemSettingService.getAll().stream().map(AdminService::toResponse).toList();
    }

    public SettingResponse updateSetting(String key, String value) {
        return toResponse(systemSettingService.update(parseKey(key), value));
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
    }

    // Tên thông số trên URL không khớp enum nào → 404 (UC19, luồng 4.1)
    private static SettingKey parseKey(String key) {
        try {
            return SettingKey.valueOf(key.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.notFound("Không có thông số " + key);
        }
    }

    private static SettingResponse toResponse(SystemSetting s) {
        return new SettingResponse(s.getSettingKey(), s.getSettingValue(), s.getDescription(), s.getUpdatedAt());
    }
}
