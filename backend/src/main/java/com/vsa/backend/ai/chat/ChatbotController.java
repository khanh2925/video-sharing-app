package com.vsa.backend.ai.chat;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Trợ lý hỏi đáp — Long. Cần đăng nhập.
 *  POST /api/chat  {message, history[]} → {reply, videos[], trimmed}
 * Lịch sử chat lưu trên máy người dùng (app gửi kèm history mỗi lần hỏi), server không lưu,
 * nên không còn API xoá trí nhớ: xoá lịch sử = app xoá trên máy.
 */
@RestController
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/api/chat")
    public ChatReply ask(@Valid @RequestBody ChatRequest request) {
        return chatbotService.ask(request.message(), request.history());
    }
}
