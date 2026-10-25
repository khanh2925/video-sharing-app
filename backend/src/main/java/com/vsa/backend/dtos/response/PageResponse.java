package com.vsa.backend.dtos.response;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Danh sách có phân trang: {content, page, size, totalElements, totalPages, last}.
 * Dùng: {@code return PageResponse.of(videoRepository.findAll(pageable), videoMapper::toResponse);}
 */
public record PageResponse<T>(List<T> content, int page, int size,
                              long totalElements, int totalPages, boolean last) {

    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast());
    }
}
