package com.vsa.backend.dtos.response;

/** Chủ đề video. JSON: {"id": 1, "name": "Travel", "icon": "...", "color": "#F44B87"} */
public record TopicResponse(
        Long id,
        String name,
        String icon,
        String color
) {
}
