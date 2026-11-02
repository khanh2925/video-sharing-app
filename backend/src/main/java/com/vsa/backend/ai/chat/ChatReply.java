package com.vsa.backend.ai.chat;

import com.vsa.backend.dtos.response.VideoResponse;

import java.util.List;

/** Câu trả lời của trợ lý, kèm các video được nhắc tới (app hiện thành thẻ bấm được). */
public record ChatReply(String reply, List<VideoResponse> videos) {
}
