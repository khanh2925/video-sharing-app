package com.vsa.backend.dtos.response;

import java.util.List;

public record SearchResponse(
        String type,
        List<?> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
}
