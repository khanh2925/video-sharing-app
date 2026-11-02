package com.vsa.backend.ai.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body của POST /api/chat. */
public record ChatRequest(
        @NotBlank(message = "Nhập câu hỏi")
        @Size(max = 500, message = "Câu hỏi tối đa 500 ký tự")
        String message) {
}
