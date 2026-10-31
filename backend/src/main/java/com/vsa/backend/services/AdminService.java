package com.vsa.backend.services;

import com.vsa.backend.dtos.request.UpdateSettingRequest;
import com.vsa.backend.dtos.response.AdminUserResponse;
import com.vsa.backend.dtos.response.SettingResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.SystemSetting;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.Role;
import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.AdminMapper;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.SystemSettingRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.unit.DataSize;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Nghiệp vụ quản trị (chỉ ADMIN, SecurityConfig đã chặn /api/admin/**):
 *  UC15 Kiểm duyệt video   – hideVideo
 *  UC16 Quản lý người dùng – lockUser, unlockUser
 *  UC19 Cấu hình hệ thống  – getSettings, updateSetting (+ getSettingValues cho app, công khai)
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    // Trần dung lượng 1 file upload trong application.yaml; VIDEO_MAX_SIZE_MB không được vượt quá
    private static final String MULTIPART_MAX_FILE_SIZE = "spring.servlet.multipart.max-file-size";

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final SystemSettingService systemSettingService;
    private final VideoMapper videoMapper;
    private final AdminMapper adminMapper;
    private final Environment environment;

    // ===== UC15 – Kiểm duyệt video =====

    /** Ẩn video vi phạm → HIDDEN: biến khỏi trang chủ, tìm kiếm, hồ sơ. Không xoá khỏi DB, không bỏ ẩn được (R15, C4). */
    @Transactional
    public VideoResponse hideVideo(Long id) {
        Video video = videoRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy video id = " + id));
        if (video.getStatus() == VideoStatus.HIDDEN) {
            throw ApiException.conflict("Video đã bị ẩn trước đó");
        }
        video.setStatus(VideoStatus.HIDDEN);
        videoRepository.save(video);
        return videoMapper.toResponse(video, false);                // VideoMapper đọc owner, topic... (LAZY) → cần @Transactional
    }

    // ===== UC16 – Quản lý người dùng =====

    /** Khoá tài khoản: JwtAuthFilter từ chối mọi token của tài khoản này dù còn hạn (R2). */
    @Transactional
    public AdminUserResponse lockUser(Long id) {
        User user = findUser(id);
        if (user.getRole() == Role.ADMIN) {
            throw ApiException.badRequest("Không thể khóa tài khoản quản trị");   // R15
        }
        if (user.isLocked()) {
            throw ApiException.conflict("Tài khoản đã bị khóa trước đó");
        }
        user.setLocked(true);
        userRepository.save(user);
        return adminMapper.toAdminUserResponse(user);
    }

    /** Mở khoá tài khoản (C5). */
    @Transactional
    public AdminUserResponse unlockUser(Long id) {
        User user = findUser(id);
        if (!user.isLocked()) {
            throw ApiException.conflict("Tài khoản chưa bị khóa");
        }
        user.setLocked(false);
        userRepository.save(user);
        return adminMapper.toAdminUserResponse(user);
    }

    // ===== UC19 – Cấu hình hệ thống =====

    /** Danh sách thông số (khoá, giá trị, mô tả, lần sửa cuối), theo thứ tự khai báo trong SettingKey. */
    public List<SettingResponse> getSettings() {
        return systemSettingService.getAll().stream()
                .sorted(Comparator.comparing(SystemSetting::getSettingKey))
                .map(adminMapper::toSettingResponse)
                .toList();
    }

    /** Đổi 1 thông số, có hiệu lực ngay (SystemSettingService cập nhật luôn bộ nhớ). */
    @Transactional
    public SettingResponse updateSetting(String key, UpdateSettingRequest request) {
        SettingKey settingKey = parseKey(key);                       // ① khoá không tồn tại → 404
        if (settingKey == SettingKey.VIDEO_MAX_SIZE_MB) {
            checkVideoSizeCap(request.value());                     // ② không vượt trần upload của server
        }
        SystemSetting setting = systemSettingService.update(settingKey, request.value());   // ③ không phải số nguyên dương → 400
        systemSettingRepository.saveAndFlush(setting);              // ④ ghi ngay để updatedAt trả về là giờ vừa sửa
        return adminMapper.toSettingResponse(setting);
    }

    /** GET /api/settings (công khai): app đọc giới hạn trước khi upload, vd {"STORY_MAX_DURATION_SEC": 15, ...}. */
    public Map<SettingKey, Integer> getSettingValues() {
        Map<SettingKey, Integer> values = new LinkedHashMap<>();
        for (SettingKey key : SettingKey.values()) {
            values.put(key, systemSettingService.getInt(key));
        }
        return values;
    }

    // ===== Hàm phụ =====

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng id = " + id));
    }

    // "story_max_duration_sec" hay "STORY_MAX_DURATION_SEC" đều được; sai tên → 404 thay vì lỗi 500 khi đổi kiểu
    private static SettingKey parseKey(String key) {
        try {
            return SettingKey.valueOf(key.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.notFound("Không có thông số " + key);
        }
    }

    private void checkVideoSizeCap(String value) {
        long capMb = DataSize.parse(environment.getProperty(MULTIPART_MAX_FILE_SIZE, "500MB")).toMegabytes();
        try {
            if (Integer.parseInt(value.trim()) > capMb) {
                throw ApiException.badRequest("Dung lượng video tối đa không được vượt quá " + capMb + " MB");
            }
        } catch (NumberFormatException e) {
            // không phải số → để SystemSettingService báo "Giá trị phải là số nguyên"
        }
    }
}
