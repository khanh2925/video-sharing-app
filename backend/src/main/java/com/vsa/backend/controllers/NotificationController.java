package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.ShareVideoRequest;
import com.vsa.backend.dtos.response.NotificationResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.services.NotificationService;
import com.vsa.backend.utils.PageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * UC20 Thông báo và chia sẻ video (đều cần token):
 *  GET  /api/notifications               thông báo của tôi, mới nhất trước, ?page=0&size=20
 *  GET  /api/notifications/unread-count  {"count": 3} → chấm đỏ trên nút chuông
 *  PUT  /api/notifications/read-all      đánh dấu đã đọc hết → 204
 *  PUT  /api/notifications/{id}/read     đánh dấu một thông báo đã đọc → 204
 *  POST /api/videos/{id}/share           {"userIds": [3, 4], "message": "..."} → {"sent": 2}
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/notifications")
    public PageResponse<NotificationResponse> getMine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return notificationService.getMine(PageUtils.of(page, size));
    }

    @GetMapping("/notifications/unread-count")
    public Map<String, Long> countUnread() {
        return notificationService.countUnread();
    }

    @PutMapping("/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead() {
        notificationService.markAllRead();
    }

    @PutMapping("/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable Long id) {
        notificationService.markRead(id);
    }

    @PostMapping("/videos/{id}/share")
    public Map<String, Integer> share(@PathVariable Long id, @Valid @RequestBody ShareVideoRequest request) {
        return notificationService.shareVideo(id, request);
    }
}
