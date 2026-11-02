package com.vsa.backend.ai.tracking;

import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Ghi lại hành vi người dùng (User tracking) — Thanh.
 * Được gọi ở controller SAU KHI thao tác chính đã xong, và nuốt lỗi: tracking hỏng KHÔNG được làm hỏng
 * thao tác chính (thích, bình luận, tìm kiếm...).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TrackingService {

    /** Loại app được tự gửi qua POST /api/events. LIKE, COMMENT, SEARCH do backend tự ghi, app không giả được. */
    private static final Set<EventType> CLIENT_TYPES = Set.of(EventType.VIEW, EventType.WATCH, EventType.SKIP);

    private final UserEventRepository userEventRepository;

    /** POST /api/events */
    public void recordFromClient(TrackEventRequest request) {
        if (!CLIENT_TYPES.contains(request.type())) {
            throw ApiException.badRequest("Loại sự kiện không hợp lệ");
        }
        record(request.type(), request.videoId(), request.watchMs(), request.durationMs(), null);
    }

    public void videoEvent(EventType type, Long videoId) {
        record(type, videoId, null, null, null);
    }

    public void search(String query) {
        if (query == null || query.isBlank()) {
            return;
        }
        String q = query.trim();
        record(EventType.SEARCH, null, null, null, q.length() > 100 ? q.substring(0, 100) : q);
    }

    public void record(EventType type, Long videoId, Integer watchMs, Integer durationMs, String query) {
        try {
            userEventRepository.save(UserEvent.builder()
                    .userId(SecurityUtils.getCurrentUserIdOrNull())
                    .videoId(videoId)
                    .eventType(type)
                    .watchMs(watchMs)
                    .durationMs(durationMs)
                    .query(query)
                    .build());
        } catch (RuntimeException e) {
            log.warn("Không ghi được sự kiện {}: {}", type, e.getMessage());
        }
    }
}
