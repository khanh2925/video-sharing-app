package com.vsa.backend.services;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Thoát ký tự đặc biệt của LIKE trước khi đưa từ khoá vào câu truy vấn (ký tự thoát là '!'). */
class SearchServiceTest {

    @Test
    void escapeLike_thoatPhanTramGachDuoiVaChamThan() {
        assertEquals("50!%", SearchService.escapeLike("50%"));
        assertEquals("a!_b", SearchService.escapeLike("a_b"));
        assertEquals("wow!!", SearchService.escapeLike("wow!"));
        assertEquals("dalat", SearchService.escapeLike("dalat"));
    }
}
