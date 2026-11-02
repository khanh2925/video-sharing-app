package com.vsa.backend.ai.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body của POST /api/chat.
 * history: các tin cũ app lưu trên máy (cũ trước, mới sau), để trợ lý hiểu câu hỏi nối tiếp.
 * Không gửi (null) = cuộc trò chuyện mới.
 */
public record ChatRequest(
        @NotBlank(message = "Nhập câu hỏi")
        @Size(max = 500, message = "Câu hỏi tối đa 500 ký tự")
        String message,
        @Valid
        @Size(max = 200, message = "Lịch sử gửi kèm tối đa 200 tin")
        List<ChatTurn> history) {
}
