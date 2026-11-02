package com.vsa.backend.services;

import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.AdminMapper;
import com.vsa.backend.mappers.CatalogMapper;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Test phần xem của trang quản trị (UC15, UC16), không cần MySQL. */
class AdminDashboardServiceTest {

    private VideoRepository videoRepository;
    private UserRepository userRepository;
    private AdminDashboardService service;

    @BeforeEach
    void setUp() {
        videoRepository = mock(VideoRepository.class);
        userRepository = mock(UserRepository.class);
        service = new AdminDashboardService(videoRepository, userRepository,
                new VideoMapper(new UserMapper(), new CatalogMapper()), new AdminMapper());
        when(videoRepository.searchForAdmin(anyString(), anyCollection(), any())).thenReturn(new PageImpl<>(List.of()));
        when(userRepository.searchForAdmin(anyString(), any(), any())).thenReturn(new PageImpl<>(List.of()));
    }

    @Test
    void stats_tongVideoKhongTinhNhap() {
        when(userRepository.count()).thenReturn(1006L);
        when(userRepository.countByLocked(true)).thenReturn(2L);
        when(videoRepository.countByStatus(VideoStatus.PUBLISHED)).thenReturn(205L);
        when(videoRepository.countByStatus(VideoStatus.HIDDEN)).thenReturn(3L);

        var s = service.getStats();
        assertEquals(1006, s.totalUsers());
        assertEquals(2, s.lockedUsers());
        assertEquals(208, s.totalVideos());
        assertEquals(3, s.hiddenVideos());
    }

    @Test
    void videos_all_layDaDangVaDaAn() {
        service.getVideos("", "all", PageRequest.of(0, 20));
        verify(videoRepository).searchForAdmin(eq(""), eq(List.of(VideoStatus.PUBLISHED, VideoStatus.HIDDEN)), any());
    }

    @Test
    void videos_trangThaiSai_400() {
        ApiException e = assertThrows(ApiException.class, () -> service.getVideos("", "DRAFT", PageRequest.of(0, 20)));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
    }

    @Test
    void users_locked_boAcaVaThoatKyTuDacBiet() {
        service.getUsers(" @lan_1 ", "LOCKED", PageRequest.of(0, 20));
        verify(userRepository).searchForAdmin(eq("lan!_1"), eq(true), any());
    }
}
