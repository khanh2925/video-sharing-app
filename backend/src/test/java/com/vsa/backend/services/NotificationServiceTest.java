package com.vsa.backend.services;

import com.vsa.backend.dtos.request.ShareVideoRequest;
import com.vsa.backend.entities.Notification;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.NotificationType;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.NotificationRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test UC20 Thông báo và chia sẻ, không cần MySQL.
 * Dữ liệu giả: lan (id 2) chia sẻ video của minh (id 3); an (id 4) là người nhận.
 */
class NotificationServiceTest {

    private static final Long LAN = 2L;
    private static final Long MINH = 3L;
    private static final Long AN = 4L;
    private static final Long VIDEO_ID = 10L;

    private NotificationRepository notificationRepository;
    private UserRepository userRepository;
    private VideoRepository videoRepository;
    private FollowRepository followRepository;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        userRepository = mock(UserRepository.class);
        videoRepository = mock(VideoRepository.class);
        followRepository = mock(FollowRepository.class);
        notificationService = new NotificationService(notificationRepository, userRepository, new UserMapper(),
                new VideoAccessPolicy(videoRepository, followRepository), mock(SimpMessagingTemplate.class));
        when(userRepository.getReferenceById(any())).thenAnswer(i -> user(i.getArgument(0)));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void notify_taoThongBaoChoChuVideo() {
        notificationService.notify(user(MINH), LAN, NotificationType.COMMENT, null, "  Hay quá  ");

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(saved.capture());
        assertEquals(MINH, saved.getValue().getRecipient().getId());
        assertEquals(LAN, saved.getValue().getActor().getId());
        assertEquals("Hay quá", saved.getValue().getText());
        assertFalse(saved.getValue().isRead());
    }

    @Test
    void notify_tuThichVideoCuaMinh_khongTaoThongBao() {
        notificationService.notify(user(MINH), MINH, NotificationType.LIKE, null, null);
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void notify_noiDungDai_bieCatNgan() {
        notificationService.notify(user(MINH), LAN, NotificationType.COMMENT, null, "a".repeat(500));

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(saved.capture());
        assertEquals(200, saved.getValue().getText().length());
    }

    @Test
    void share_guiChoNguoiXemDuoc_boQuaChinhMinhVaTrungLap() {
        dangNhapLa(LAN);
        video(Visibility.PUBLIC);
        when(userRepository.findById(AN)).thenReturn(Optional.of(user(AN)));

        Map<String, Integer> res = notificationService.shareVideo(VIDEO_ID,
                new ShareVideoRequest(List.of(AN, AN, LAN), "Xem cái này nè"));

        assertEquals(1, res.get("sent"));
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void share_videoNguoiTheoDoi_nguoiNhanChuaTheoDoi_baoLoi() {
        dangNhapLa(LAN);
        video(Visibility.FOLLOWERS);
        when(followRepository.existsByFollowerIdAndFollowingId(LAN, MINH)).thenReturn(true);   // lan xem được
        when(followRepository.existsByFollowerIdAndFollowingId(AN, MINH)).thenReturn(false);   // an thì không
        when(userRepository.findById(AN)).thenReturn(Optional.of(user(AN)));

        ApiException e = assertThrows(ApiException.class, () -> notificationService.shareVideo(VIDEO_ID,
                new ShareVideoRequest(List.of(AN), null)));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void markRead_thongBaoCuaNguoiKhac_404() {
        dangNhapLa(LAN);
        when(notificationRepository.findByIdAndRecipientId(99L, LAN)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> notificationService.markRead(99L));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    private void video(Visibility visibility) {
        Video v = Video.builder().id(VIDEO_ID).title("Mèo").owner(user(MINH))
                .status(VideoStatus.PUBLISHED).visibility(visibility).build();
        when(videoRepository.findById(VIDEO_ID)).thenReturn(Optional.of(v));
    }

    private static void dangNhapLa(Long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, null, List.of()));
    }

    private static User user(Long id) {
        return User.builder().id(id).username("user" + id).email("user" + id + "@vsa.local")
                .displayName("user" + id).passwordHash("x").build();
    }
}
