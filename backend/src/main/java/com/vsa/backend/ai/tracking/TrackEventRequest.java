package com.vsa.backend.ai.tracking;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Body của POST /api/events. App chỉ được gửi VIEW, WATCH, SKIP; các loại khác backend tự ghi. */
public record TrackEventRequest(
        @NotNull(message = "Thiếu video") Long videoId,
        @NotNull(message = "Thiếu loại sự kiện") EventType type,
        @Min(value = 0, message = "Thời gian xem không hợp lệ") Integer watchMs,
        @Min(value = 0, message = "Độ dài video không hợp lệ") Integer durationMs) {
}
