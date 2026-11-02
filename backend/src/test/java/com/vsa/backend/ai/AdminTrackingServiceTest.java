package com.vsa.backend.ai;

import com.vsa.backend.ai.tracking.AdminTrackingService;
import com.vsa.backend.ai.tracking.EventType;
import com.vsa.backend.ai.tracking.UserEvent;
import com.vsa.backend.ai.tracking.UserEventRepository;
import com.vsa.backend.ai.tracking.UserEventResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.exceptions.ApiException;
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

/** Trang quản trị xem nhật ký hành vi (user_events), không cần MySQL. */
class AdminTrackingServiceTest {

    private UserEventRepository userEventRepository;
    private UserRepository userRepository;
    private VideoRepository videoRepository;
    private AdminTrackingService service;
    private final PageRequest page = PageRequest.of(0, 20);

    @BeforeEach
    void setUp() {
        userEventRepository = mock(UserEventRepository.class);
        userRepository = mock(UserRepository.class);
        videoRepository = mock(VideoRepository.class);
        service = new AdminTrackingService(userEventRepository, userRepository, videoRepository);
    }

    private static UserEvent event(long id, Long userId, EventType type, Long videoId) {
        return UserEvent.builder().id(id).userId(userId).eventType(type).videoId(videoId).build();
    }

    @Test
    void getEvents_khongLoc_ghepTenNguoiDungVaTieuDeVideo() {
        User lan = new User();
        lan.setId(3L);
        lan.setUsername("lan");
        Video dalat = new Video();
        dalat.setId(1L);
        dalat.setTitle("Du lịch Đà Lạt");
        when(userEventRepository.findAllByOrderByIdDesc(page)).thenReturn(new PageImpl<>(List.of(
                event(2, 3L, EventType.WATCH, 1L),
                event(1, null, EventType.SEARCH, null)), page, 2));
        when(userRepository.findAllById(List.of(3L))).thenReturn(List.of(lan));
        when(videoRepository.findAllById(List.of(1L))).thenReturn(List.of(dalat));

        PageResponse<UserEventResponse> result = service.getEvents(null, "ALL", page);

        assertEquals(2, result.content().size());
        UserEventResponse watch = result.content().get(0);
        assertEquals("lan", watch.username());
        assertEquals("Du lịch Đà Lạt", watch.videoTitle());
        UserEventResponse search = result.content().get(1);
        assertNull(search.username());   // khách
        assertNull(search.videoTitle());
    }

    @Test
    void getEvents_locTheoNguoiVaLoai_goiDungTruyVan() {
        when(userEventRepository.findByUserIdAndEventTypeOrderByIdDesc(3L, EventType.SKIP, page))
                .thenReturn(new PageImpl<>(List.of(), page, 0));

        service.getEvents(3L, "skip", page);   // chữ thường vẫn nhận

        verify(userEventRepository).findByUserIdAndEventTypeOrderByIdDesc(3L, EventType.SKIP, page);
        verify(userEventRepository, never()).findAllByOrderByIdDesc(any());
    }

    @Test
    void getEvents_chiLocTheoNguoi() {
        when(userEventRepository.findByUserIdOrderByIdDesc(3L, page)).thenReturn(new PageImpl<>(List.of(), page, 0));

        service.getEvents(3L, "", page);

        verify(userEventRepository).findByUserIdOrderByIdDesc(3L, page);
    }

    @Test
    void getEvents_loaiSai_bao400() {
        ApiException ex = assertThrows(ApiException.class, () -> service.getEvents(null, "XEM", page));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verifyNoInteractions(userEventRepository);
    }
}
