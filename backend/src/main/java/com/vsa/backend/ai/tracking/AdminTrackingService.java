package com.vsa.backend.ai.tracking;

import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Quản trị viên xem nhật ký hành vi (bảng user_events) mà không cần vào database — chỉ đọc.
 * Dùng để kiểm tra tracking trên VPS, nơi MySQL không mở ra ngoài.
 */
@Service
@RequiredArgsConstructor
public class AdminTrackingService {

    private final UserEventRepository userEventRepository;
    private final UserRepository userRepository;
    private final VideoRepository videoRepository;

    /** GET /api/admin/ai/events?userId=&type=&page=&size= */
    @Transactional(readOnly = true)
    public PageResponse<UserEventResponse> getEvents(Long userId, String rawType, Pageable pageable) {
        EventType type = parseType(rawType);
        Page<UserEvent> page;
        if (userId != null && type != null) {
            page = userEventRepository.findByUserIdAndEventTypeOrderByIdDesc(userId, type, pageable);
        } else if (userId != null) {
            page = userEventRepository.findByUserIdOrderByIdDesc(userId, pageable);
        } else if (type != null) {
            page = userEventRepository.findByEventTypeOrderByIdDesc(type, pageable);
        } else {
            page = userEventRepository.findAllByOrderByIdDesc(pageable);
        }

        // Đọc tên người dùng và tiêu đề video của cả trang bằng 2 câu, không phải mỗi dòng một câu
        Map<Long, String> usernames = userRepository.findAllById(page.getContent().stream()
                        .map(UserEvent::getUserId).filter(Objects::nonNull).distinct().toList()).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));
        Map<Long, String> titles = videoRepository.findAllById(page.getContent().stream()
                        .map(UserEvent::getVideoId).filter(Objects::nonNull).distinct().toList()).stream()
                .collect(Collectors.toMap(Video::getId, Video::getTitle));

        return PageResponse.of(page, e -> new UserEventResponse(e.getId(), e.getUserId(),
                usernames.get(e.getUserId()), e.getEventType(), e.getVideoId(), titles.get(e.getVideoId()),
                e.getWatchMs(), e.getDurationMs(), e.getQuery(), e.getCreatedAt()));
    }

    /** "" hoặc ALL = mọi loại; tên sai thì báo 400 kèm các loại hợp lệ. */
    static EventType parseType(String rawType) {
        if (rawType == null || rawType.isBlank() || rawType.equalsIgnoreCase("ALL")) {
            return null;
        }
        try {
            return EventType.valueOf(rawType.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Loại sự kiện phải là ALL, VIEW, WATCH, SKIP, LIKE, UNLIKE, COMMENT hoặc SEARCH");
        }
    }
}
