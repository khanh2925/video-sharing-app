package com.vsa.backend.dtos.response;

public record LiveSocketEventResponse(
        String event,
        Integer viewerCount,
        LiveMessageResponse message,
        LiveStreamResponse live
) {
}
