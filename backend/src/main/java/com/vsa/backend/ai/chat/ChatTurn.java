package com.vsa.backend.ai.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Một tin trong lịch sử chat app gửi kèm (lịch sử lưu trên máy người dùng, không lưu ở server).
 * role: "user" = người dùng hỏi, "bot" = trợ lý trả lời.
 */
public record ChatTurn(
        @NotBlank
        @Pattern(regexp = "user|bot", message = "role chỉ nhận user hoặc bot")
        String role,
        @NotBlank
        @Size(max = 4000, message = "Mỗi tin trong lịch sử tối đa 4000 ký tự")
        String text) {
}
