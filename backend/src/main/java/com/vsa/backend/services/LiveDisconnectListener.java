package com.vsa.backend.services;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class LiveDisconnectListener {

    private final LiveStreamService liveStreamService;

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        Principal principal = event.getUser();
        if (principal != null) {
            liveStreamService.leaveAll(Long.valueOf(principal.getName()));
        }
    }
}
