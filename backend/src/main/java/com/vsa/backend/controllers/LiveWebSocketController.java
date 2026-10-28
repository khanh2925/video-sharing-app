package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.LiveMessageRequest;
import com.vsa.backend.enums.LiveMessageType;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.services.LiveStreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Slf4j
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

    // ===== Lỗi khi xử lý tin nhắn WebSocket =====
    // GlobalExceptionHandler chỉ bắt lỗi của API HTTP. Lỗi ở đây gửi riêng cho người gửi
    // qua kênh /user/queue/errors (broadcast = false: chỉ phiên đang gửi nhận, không phải mọi thiết bị),
    // dạng {status, message} giống API. App subscribe "/user/queue/errors" để hiện thông báo.

    @MessageExceptionHandler(ApiException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public Map<String, Object> handleApiException(ApiException e) {
        return error(e.getStatus().value(), e.getMessage());
    }

    // @Valid trên LiveMessageRequest sai (vd nội dung quá dài)
    @MessageExceptionHandler(MethodArgumentNotValidException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public Map<String, Object> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult() == null ? null : e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse(null);
        return error(400, message != null ? message : "Dữ liệu gửi lên không hợp lệ");
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public Map<String, Object> handleOther(Exception e) {
        log.error("Lỗi không mong muốn khi xử lý tin nhắn live", e);
        return error(500, "Lỗi hệ thống, vui lòng thử lại");
    }

    private static Map<String, Object> error(int status, String message) {
        return Map.of("status", status, "message", message);
    }

    private Long userId(Principal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Bạn cần đăng nhập");
        }
        return Long.valueOf(principal.getName());
    }
}
