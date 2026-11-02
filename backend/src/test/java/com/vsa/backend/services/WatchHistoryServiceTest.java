package com.vsa.backend.services;

import com.vsa.backend.mappers.CatalogMapper;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.VideoLikeRepository;
import com.vsa.backend.repositories.WatchHistoryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/** Test lịch sử xem, không cần MySQL. */
class WatchHistoryServiceTest {

    private WatchHistoryRepository watchHistoryRepository;
    private WatchHistoryService service;

    @BeforeEach
    void setUp() {
        watchHistoryRepository = mock(WatchHistoryRepository.class);
        service = new WatchHistoryService(watchHistoryRepository, mock(VideoLikeRepository.class),
                new VideoMapper(new UserMapper(), new CatalogMapper()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void record_daDangNhap_ghiLichSu() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(2L, null, List.of()));
        service.record(10L);
        verify(watchHistoryRepository).upsert(2L, 10L);
    }

    @Test
    void record_khach_khongGhi() {
        service.record(10L);
        verify(watchHistoryRepository, never()).upsert(anyLong(), anyLong());
    }

    @Test
    void clearMine_xoaDungLichSuCuaMinh() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(2L, null, List.of()));
        service.clearMine();
        verify(watchHistoryRepository).deleteByUserId(2L);
    }
}
