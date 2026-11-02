package com.vsa.backend.services;

import com.vsa.backend.dtos.response.AdminStatsResponse;
import com.vsa.backend.dtos.response.AdminUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.AdminMapper;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * Phần XEM của trang quản trị (bảng điều khiển, danh sách để kiểm duyệt). Phần thao tác
 * (ẩn video, khoá / mở khoá, sửa thông số) vẫn ở AdminService của Long.
 */
@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final VideoMapper videoMapper;
    private final AdminMapper adminMapper;

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        long published = videoRepository.countByStatus(VideoStatus.PUBLISHED);
        long hidden = videoRepository.countByStatus(VideoStatus.HIDDEN);
        return new AdminStatsResponse(userRepository.count(), userRepository.countByLocked(true),
                published + hidden, published, hidden);
    }

    /** status: ALL (đã đăng + đã ẩn), PUBLISHED, HIDDEN. Bản nháp là việc riêng của tác giả nên không hiện. */
    @Transactional(readOnly = true)
    public PageResponse<VideoResponse> getVideos(String q, String status, Pageable pageable) {
        List<VideoStatus> statuses = switch (normalize(status)) {
            case "ALL" -> List.of(VideoStatus.PUBLISHED, VideoStatus.HIDDEN);
            case "PUBLISHED" -> List.of(VideoStatus.PUBLISHED);
            case "HIDDEN" -> List.of(VideoStatus.HIDDEN);
            default -> throw ApiException.badRequest("Trạng thái phải là ALL, PUBLISHED hoặc HIDDEN");
        };
        return PageResponse.of(videoRepository.searchForAdmin(query(q), statuses, pageable),
                v -> videoMapper.toResponse(v, false));
    }

    /** status: ALL, ACTIVE (đang hoạt động), LOCKED (bị khoá). */
    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> getUsers(String q, String status, Pageable pageable) {
        Boolean locked = switch (normalize(status)) {
            case "ALL" -> null;
            case "ACTIVE" -> false;
            case "LOCKED" -> true;
            default -> throw ApiException.badRequest("Trạng thái phải là ALL, ACTIVE hoặc LOCKED");
        };
        return PageResponse.of(userRepository.searchForAdmin(query(q), locked, pageable),
                adminMapper::toAdminUserResponse);
    }

    private static String normalize(String status) {
        return status == null || status.isBlank() ? "ALL" : status.trim().toUpperCase(Locale.ROOT);
    }

    private static String query(String q) {
        return SearchService.escapeLike(q == null ? "" : q.trim().replaceFirst("^@", ""));
    }
}
