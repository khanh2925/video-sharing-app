package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.LiveMessageRequest;
import com.vsa.backend.enums.LiveMessageType;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.services.LiveStreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class LiveWebSocketController {

    private final LiveStreamService liveStreamService;

    @MessageMapping("/live/{id}/join")
    public void join(@DestinationVariable Long id, Principal principal) {
        liveStreamService.join(id, userId(principal));
    }

    @MessageMapping("/live/{id}/leave")
    public void leave(@DestinationVariable Long id, Principal principal) {
        liveStreamService.leave(id, userId(principal));
    }

    @MessageMapping("/live/{id}/chat")
    public void chat(@DestinationVariable Long id, Principal principal,
                     @Valid @Payload LiveMessageRequest request) {
        liveStreamService.sendMessage(id, userId(principal), LiveMessageType.COMMENT, request.content());
    }

    @MessageMapping("/live/{id}/react")
    public void react(@DestinationVariable Long id, Principal principal,
                      @Valid @Payload LiveMessageRequest request) {
        liveStreamService.sendMessage(id, userId(principal), LiveMessageType.REACTION, request.content());
    }

    private Long userId(Principal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Bạn cần đăng nhập");
        }
        return Long.valueOf(principal.getName());
    }
}
