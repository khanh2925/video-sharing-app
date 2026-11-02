package com.vsa.backend.ai.tracking;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * POST /api/events  {videoId, type: VIEW|WATCH|SKIP, watchMs, durationMs} → 204
 * Khách cũng gửi được (SecurityConfig mở), sự kiện của khách lưu user_id null.
 */
@RestController
@RequiredArgsConstructor
public class TrackingController {

    private final TrackingService trackingService;

    @PostMapping("/api/events")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void track(@Valid @RequestBody TrackEventRequest request) {
        trackingService.recordFromClient(request);
    }
}
