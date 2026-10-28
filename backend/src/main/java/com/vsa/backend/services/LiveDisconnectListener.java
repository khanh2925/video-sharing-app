package com.vsa.backend.services;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

/**
 * Khi một kết nối WebSocket đóng (tắt app, mất mạng...):
 *  - người xem: rời mọi phòng đang xem, cập nhật số người xem;
 *  - chủ phòng: tự kết thúc buổi live đang phát, người xem nhận sự kiện "ENDED"
 *    (nếu không, buổi live treo ở trạng thái LIVE mãi).
 */
@Component
@RequiredArgsConstructor
public class LiveDisconnectListener {

    private final LiveStreamService liveStreamService;

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        Principal principal = event.getUser();
        if (principal != null) {
            Long userId = Long.valueOf(principal.getName());
            liveStreamService.leaveAll(userId);
            liveStreamService.endAllLiveOfHost(userId);
        }
    }
}
