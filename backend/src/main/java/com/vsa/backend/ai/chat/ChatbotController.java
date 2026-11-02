package com.vsa.backend.ai.chat;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Trợ lý hỏi đáp — Long. Cần đăng nhập (mỗi người một cuộc hội thoại).
 *  POST   /api/chat  {message} → {reply, videos[]}
 *  DELETE /api/chat            → xoá trí nhớ, bắt đầu cuộc trò chuyện mới
 */
@RestController
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/api/chat")
    public ChatReply ask(@Valid @RequestBody ChatRequest request) {
        return chatbotService.ask(request.message());
    }

    @DeleteMapping("/api/chat")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset() {
        chatbotService.reset();
    }
}
