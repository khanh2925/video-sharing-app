package com.vsa.backend.services;

import com.vsa.backend.configurations.AppProperties;
import com.vsa.backend.dtos.request.CommentCreateRequest;
import com.vsa.backend.entities.Comment;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.entities.VideoLike;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Test UC11: thích / bình luận phải theo quyền xem video (bảng 6.2), bộ đếm cộng trừ bằng câu UPDATE.
 * Dữ liệu giả: minh (id 3) là chủ video, lan (id 2) là người xem.
 */
class InteractionServiceTest {

    private static final Long LAN = 2L;
    private static final Long MINH = 3L;
    private static final Long VIDEO_ID = 10L;

    private VideoRepository videoRepository;
    private VideoLikeRepository videoLikeRepository;
    private CommentRepository commentRepository;
    private CommentLikeRepository commentLikeRepository;
    private FollowRepository followRepository;
    private InteractionService interactionService;

    @BeforeEach
    void setUp() {
        videoRepository = mock(VideoRepository.class);
        videoLikeRepository = mock(VideoLikeRepository.class);
        commentRepository = mock(CommentRepository.class);
        commentLikeRepository = mock(CommentLikeRepository.class);
        followRepository = mock(FollowRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        AppProperties appProperties = new AppProperties(null, null, null, null,
                new AppProperties.PagingSettings(20, 10, 10));

        interactionService = new InteractionService(videoRepository, videoLikeRepository, commentRepository,
                commentLikeRepository, userRepository, new UserMapper(), appProperties,
                new VideoAccessPolicy(videoRepository, followRepository));

        when(userRepository.getReferenceById(LAN)).thenReturn(user(LAN));
        when(commentRepository.findByVideoIdOrderByCreatedAtDesc(eq(VIDEO_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(commentRepository.save(any(Comment.class))).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ---------- Quyền xem (bảng 6.2) ----------

    @Test
    void getComments_videoRiengTu_khach_bi404() {
        coVideo(Visibility.PRIVATE, VideoStatus.PUBLISHED);

        ApiException e = assertThrows(ApiException.class, () -> interactionService.getComments(VIDEO_ID, 0));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        verify(commentRepository, never()).findByVideoIdOrderByCreatedAtDesc(any(), any());
    }

    @Test
    void getComments_videoNguoiTheoDoi_chuaTheoDoi_bi404() {
        dangNhapLa(LAN);
        coVideo(Visibility.FOLLOWERS, VideoStatus.PUBLISHED);
        when(followRepository.existsByFollowerIdAndFollowingId(LAN, MINH)).thenReturn(false);

        ApiException e = assertThrows(ApiException.class, () -> interactionService.getComments(VIDEO_ID, 0));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    @Test
    void getComments_videoNguoiTheoDoi_dangTheoDoi_xemDuoc() {
        dangNhapLa(LAN);
        coVideo(Visibility.FOLLOWERS, VideoStatus.PUBLISHED);
        when(followRepository.existsByFollowerIdAndFollowingId(LAN, MINH)).thenReturn(true);

        assertDoesNotThrow(() -> interactionService.getComments(VIDEO_ID, 0));
    }

    @Test
    void likeVideo_videoRiengTuCuaNguoiKhac_bi404_khongLuu() {
        dangNhapLa(LAN);
        coVideo(Visibility.PRIVATE, VideoStatus.PUBLISHED);

        ApiException e = assertThrows(ApiException.class, () -> interactionService.likeVideo(VIDEO_ID));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        verify(videoLikeRepository, never()).save(any());
        verify(videoRepository, never()).addLikeCount(anyLong(), anyLong());
    }

    @Test
    void createComment_videoRiengTuCuaNguoiKhac_bi404() {
        dangNhapLa(LAN);
        coVideo(Visibility.PRIVATE, VideoStatus.PUBLISHED);

        ApiException e = assertThrows(ApiException.class,
                () -> interactionService.createComment(VIDEO_ID, new CommentCreateRequest("hay quá")));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    @Test
    void likeComment_videoCuaBinhLuanRiengTu_bi404() {
        dangNhapLa(LAN);
        Video video = coVideo(Visibility.PRIVATE, VideoStatus.PUBLISHED);
        Comment comment = Comment.builder().id(50L).content("x").video(video).user(user(MINH)).build();
        when(commentRepository.findById(50L)).thenReturn(Optional.of(comment));

        ApiException e = assertThrows(ApiException.class, () -> interactionService.likeComment(50L));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        verify(commentRepository, never()).addLikeCount(anyLong(), anyLong());
    }

    // ---------- Bộ đếm cộng trừ trong DB ----------

    @Test
    void likeVideo_congBangCauUpdate_khongSetTrenEntity() {
        dangNhapLa(LAN);
        Video video = coVideo(Visibility.PUBLIC, VideoStatus.PUBLISHED);

        interactionService.likeVideo(VIDEO_ID);

        verify(videoLikeRepository).save(any(VideoLike.class));
        verify(videoRepository).addLikeCount(VIDEO_ID, 1);
        assertEquals(0, video.getLikeCount());   // entity giữ nguyên, tránh Hibernate ghi đè số cũ
    }

    @Test
    void createComment_congSoBinhLuanBangCauUpdate() {
        dangNhapLa(LAN);
        coVideo(Visibility.PUBLIC, VideoStatus.PUBLISHED);

        interactionService.createComment(VIDEO_ID, new CommentCreateRequest("  hay quá  "));

        verify(videoRepository).addCommentCount(VIDEO_ID, 1);
    }

    // ---------- Hàm phụ ----------

    private Video coVideo(Visibility visibility, VideoStatus status) {
        Video video = Video.builder().id(VIDEO_ID).title("Video").videoUrl("/files/videos/a.mp4")
                .visibility(visibility).status(status).owner(user(MINH)).build();
        when(videoRepository.findById(VIDEO_ID)).thenReturn(Optional.of(video));
        return video;
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
