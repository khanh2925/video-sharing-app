package com.vsa.backend.utils;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Chuẩn hoá tham số phân trang từ URL để người gọi không làm hỏng truy vấn:
 * page âm → 0; size ≤ 0 → 1; size quá lớn (vd ?size=100000 kéo cả bảng) → MAX_PAGE_SIZE.
 */
public final class PageUtils {

    public static final int MAX_PAGE_SIZE = 50;

    private PageUtils() {
    }

    public static PageRequest of(int page, int size) {
        return of(page, size, Sort.unsorted());
    }

    public static PageRequest of(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE), sort);
    }

    /** Cho API nhận Pageable (Spring tự đọc ?page=&size=&sort=): giữ nguyên sort, chỉ chặn size. */
    public static Pageable clamp(Pageable pageable) {
        return of(pageable.getPageNumber(), pageable.getPageSize(), pageable.getSort());
    }
}
