package com.vsa.backend.ai.chat;

import com.vsa.backend.dtos.response.VideoResponse;

import java.util.List;

/**
 * Câu trả lời của trợ lý, kèm các video được nhắc tới (app hiện thành thẻ bấm được).
 * trimmed: số tin CŨ NHẤT trong history bị bỏ vì vượt giới hạn token → app xoá đúng chừng ấy tin khỏi máy.
 */
public record ChatReply(String reply, List<VideoResponse> videos, int trimmed) {
}
