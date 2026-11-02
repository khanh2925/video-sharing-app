package com.vsa.backend.ai.tracking;

import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.utils.PageUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Xem nhật ký hành vi — chỉ ADMIN (SecurityConfig chặn sẵn /api/admin/**), chỉ đọc.
 * Chạy được cả khi AI tắt, vì tracking luôn ghi.
 *  GET /api/admin/ai/events?userId=3&type=WATCH&page=0&size=20
 */
@RestController
@RequiredArgsConstructor
public class AdminTrackingController {

    private final AdminTrackingService adminTrackingService;

    @GetMapping("/api/admin/ai/events")
    public PageResponse<UserEventResponse> getEvents(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "ALL") String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminTrackingService.getEvents(userId, type, PageUtils.of(page, size));
    }
}
