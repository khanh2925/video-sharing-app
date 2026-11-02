package com.vsa.backend.services;

import com.vsa.backend.dtos.request.CreateLiveRequest;
import com.vsa.backend.dtos.response.LiveSocketEventResponse;
import com.vsa.backend.entities.LiveStream;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.LiveStatus;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.LiveMessageRepository;
import com.vsa.backend.repositories.LiveStreamRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Test UC13 phát live. Người đang đăng nhập giả lập là hoa (id 4). */
class LiveStreamServiceTest {

    private static final Long HOA = 4L;
    private static final Long VIDEO_ID = 20L;

    private LiveStreamRepository liveStreamRepository;
    private VideoRepository videoRepository;
    private SimpMessagingTemplate messagingTemplate;
    private LiveStreamService liveStreamService;

    @BeforeEach
    void setUp() {
        liveStreamRepository = mock(LiveStreamRepository.class);
        videoRepository = mock(VideoRepository.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        UserRepository userRepository = mock(UserRepository.class);
        liveStreamService = new LiveStreamService(liveStreamRepository, mock(LiveMessageRepository.class),
                videoRepository, userRepository, new UserMapper(), messagingTemplate);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(HOA, null, List.of()));
        when(userRepository.findByIdForLiveCreation(HOA)).thenReturn(Optional.of(user(HOA)));
        when(liveStreamRepository.save(any(LiveStream.class))).thenAnswer(i -> {   // giả lập DB cấp id
            LiveStream live = i.getArgument(0);
            live.setId(99L);
            return live;
        });
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_videoNguonRiengTu_bi400() {
        coVideoNguon(Visibility.PRIVATE, VideoStatus.PUBLISHED);

        ApiException e = assertThrows(ApiException.class, () -> liveStreamService.create(request()));

        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
        assertEquals("Video nguồn phải là video công khai đã đăng", e.getMessage());
        verify(liveStreamRepository, never()).save(any());
    }

    @Test
    void create_videoNguonLaBanNhap_bi400() {
        coVideoNguon(Visibility.PUBLIC, VideoStatus.DRAFT);

        ApiException e = assertThrows(ApiException.class, () -> liveStreamService.create(request()));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
    }

    @Test
    void create_conBuoiLiveCu_bao409VaGiuNguyenBuoiCu() {
        coVideoNguon(Visibility.PUBLIC, VideoStatus.PUBLISHED);
        when(liveStreamRepository.existsByHostIdAndStatus(HOA, LiveStatus.LIVE)).thenReturn(true);

        ApiException e = assertThrows(ApiException.class, () -> liveStreamService.create(request()));

        assertEquals(HttpStatus.CONFLICT, e.getStatus());
        assertEquals("Bạn đang có một buổi live chưa kết thúc", e.getMessage());
        verify(liveStreamRepository, never()).findByHostIdAndStatus(any(), any());
        verifyNoInteractions(messagingTemplate);
        verify(liveStreamRepository, never()).save(any());
    }

    @Test
    void create_chuaCoLive_taoBuoiMoi() {
        coVideoNguon(Visibility.PUBLIC, VideoStatus.PUBLISHED);

        var response = liveStreamService.create(request());

        assertEquals(99L, response.id());
        verify(liveStreamRepository).save(any(LiveStream.class));
    }

    @Test
    void endAllLiveOfHost_chuPhongMatKetNoi_ketThucVaBaoEnded() {
        LiveStream live = LiveStream.builder().id(8L).title("Đang phát").sourceVideoUrl("/files/videos/a.mp4")
                .host(user(HOA)).build();
        when(liveStreamRepository.findByHostIdAndStatus(HOA, LiveStatus.LIVE)).thenReturn(List.of(live));

        liveStreamService.endAllLiveOfHost(HOA);

        assertEquals(LiveStatus.ENDED, live.getStatus());
        verify(messagingTemplate).convertAndSend(eq("/topic/live/8"), any(LiveSocketEventResponse.class));
    }

    private void coVideoNguon(Visibility visibility, VideoStatus status) {
        Video video = Video.builder().id(VIDEO_ID).title("Nguồn").videoUrl("/files/videos/a.mp4")
                .visibility(visibility).status(status).owner(user(HOA)).build();
        when(videoRepository.findById(VIDEO_ID)).thenReturn(Optional.of(video));
    }

    private static CreateLiveRequest request() {
        return new CreateLiveRequest("Live tối nay", VIDEO_ID, null, null, null);
    }

    private static User user(Long id) {
        return User.builder().id(id).username("user" + id).email("user" + id + "@vsa.local")
                .displayName("user" + id).passwordHash("x").build();
    }
}
