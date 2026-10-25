package com.vsa.backend.dtos.response;

/** Bài nhạc nền để chọn khi chỉnh sửa video (UC09). */
public record AudioResponse(
        Long id,
        String title,
        String artist,
        String coverUrl,
        int durationSec,
        boolean trending
) {
}
