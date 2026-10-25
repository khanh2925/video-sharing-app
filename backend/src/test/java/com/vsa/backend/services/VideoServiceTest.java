package com.vsa.backend.services;

import com.vsa.backend.dtos.request.CreateVideoRequest;
import com.vsa.backend.dtos.request.UpdateVideoRequest;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.Hashtag;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.CatalogMapper;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Test UC08–UC10. Người đang đăng nhập giả lập là user id 2. */
class VideoServiceTest {

    private static final Long ME = 2L;
    private static final String VIDEO_URL = "/files/videos/abc.mp4";

    private VideoRepository videoRepository;
    private UserRepository userRepository;
    private TopicRepository topicRepository;
    private HashtagRepository hashtagRepository;
    private VideoLikeRepository videoLikeRepository;
    private CommentRepository commentRepository;
    private CommentLikeRepository commentLikeRepository;
    private FileStorageService fileStorageService;
    private VideoService videoService;

    private final MockMultipartFile videoFile =
            new MockMultipartFile("file", "clip.mp4", "video/mp4", new byte[]{1, 2, 3});

    @BeforeEach
    void setUp() {
        videoRepository = mock(VideoRepository.class);
        userRepository = mock(UserRepository.class);
        topicRepository = mock(TopicRepository.class);
        hashtagRepository = mock(HashtagRepository.class);
        videoLikeRepository = mock(VideoLikeRepository.class);
        commentRepository = mock(CommentRepository.class);
        commentLikeRepository = mock(CommentLikeRepository.class);
        fileStorageService = mock(FileStorageService.class);
        VideoMapper videoMapper = new VideoMapper(new UserMapper(), new CatalogMapper());

        videoService = new VideoService(videoRepository, userRepository, topicRepository,
                mock(AudioRepository.class), hashtagRepository, videoLikeRepository,
                commentRepository, commentLikeRepository, fileStorageService, videoMapper);

        // Giả lập "đã đăng nhập" giống JwtAuthFilter: principal là id người dùng
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(ME, null, List.of()));

        when(userRepository.findById(ME)).thenReturn(Optional.of(user(ME)));
        when(fileStorageService.saveVideo(any())).thenReturn(VIDEO_URL);
        when(hashtagRepository.findByName(anyString())).thenReturn(Optional.empty());
        when(hashtagRepository.save(any(Hashtag.class))).thenAnswer(i -> i.getArgument(0));
        when(videoRepository.saveAndFlush(any(Video.class))).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ---------- UC08 ----------

    @Test
    void create_macDinhDangCongKhai_vaChuanHoaHashtag() {
        CreateVideoRequest request = new CreateVideoRequest("  Đà Lạt  ", null,
                List.of("#DuLich #dalat", "dulich"), null, null, "Vintage", null, null, null);

        VideoResponse response = videoService.create(videoFile, null, request);

        assertEquals("Đà Lạt", response.title());
        assertEquals(VideoStatus.PUBLISHED, response.status());
        assertEquals(Visibility.PUBLIC, response.visibility());
        assertTrue(response.allowComments());
        assertEquals(List.of("dalat", "dulich"), response.hashtags());   // bỏ #, viết thường, bỏ trùng
        assertEquals(VIDEO_URL, response.videoUrl());
    }

    @Test
    void create_saveDraft_luuTrangThaiDraft() {
        CreateVideoRequest request = new CreateVideoRequest("Nháp", null, null, null, null,
                null, Visibility.FOLLOWERS, false, true);

        VideoResponse response = videoService.create(videoFile, null, request);

        assertEquals(VideoStatus.DRAFT, response.status());
        assertEquals(Visibility.FOLLOWERS, response.visibility());
        assertFalse(response.allowComments());
    }

    @Test
    void create_chuDeKhongTonTai_bao404_vaKhongLuuFile() {
        when(topicRepository.findById(99L)).thenReturn(Optional.empty());
        CreateVideoRequest request = new CreateVideoRequest("A", null, null, 99L, null, null, null, null, null);

        ApiException e = assertThrows(ApiException.class, () -> videoService.create(videoFile, null, request));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        verify(fileStorageService, never()).saveVideo(any());
    }

    @Test
    void create_luuDbLoi_xoaFileVuaGhi() {
        when(videoRepository.saveAndFlush(any(Video.class))).thenThrow(new RuntimeException("DB lỗi"));
        CreateVideoRequest request = new CreateVideoRequest("A", null, null, null, null, null, null, null, null);

        assertThrows(RuntimeException.class, () -> videoService.create(videoFile, null, request));

        verify(fileStorageService).delete(VIDEO_URL);
    }

    @Test
    void normalizeHashtags_quaDai_bao400() {
        String tooLong = "a".repeat(51);
        assertThrows(ApiException.class, () -> VideoService.normalizeHashtags(List.of(tooLong)));
    }

    // ---------- UC10 ----------

    @Test
    void update_dangBanNhap_chuyenSangPublished() {
        Video draft = video(10L, ME, VideoStatus.DRAFT);
        when(videoRepository.findById(10L)).thenReturn(Optional.of(draft));

        VideoResponse response = videoService.update(10L,
                new UpdateVideoRequest("Tiêu đề mới", null, null, null, true));

        assertEquals(VideoStatus.PUBLISHED, response.status());
        assertEquals("Tiêu đề mới", response.title());
    }

    @Test
    void update_videoNguoiKhac_bao403() {
        when(videoRepository.findById(10L)).thenReturn(Optional.of(video(10L, 3L, VideoStatus.PUBLISHED)));

        ApiException e = assertThrows(ApiException.class,
                () -> videoService.update(10L, new UpdateVideoRequest("X", null, null, null, null)));

        assertEquals(HttpStatus.FORBIDDEN, e.getStatus());
    }

    @Test
    void update_videoBiAn_bao403() {
        when(videoRepository.findById(10L)).thenReturn(Optional.of(video(10L, ME, VideoStatus.HIDDEN)));

        ApiException e = assertThrows(ApiException.class,
                () -> videoService.update(10L, new UpdateVideoRequest("X", null, null, null, null)));

        assertEquals("Video đã bị quản trị viên ẩn", e.getMessage());
    }

    @Test
    void delete_xoaDungThuTu_roiMoiXoaFile() {
        when(videoRepository.findById(10L)).thenReturn(Optional.of(video(10L, ME, VideoStatus.PUBLISHED)));

        videoService.delete(10L);

        InOrder order = inOrder(commentLikeRepository, commentRepository, videoLikeRepository,
                videoRepository, fileStorageService);
        order.verify(commentLikeRepository).deleteAllOnCommentsOfVideo(10L);
        order.verify(commentRepository).deleteAllByVideoId(10L);
        order.verify(videoLikeRepository).deleteAllByVideoId(10L);
        order.verify(videoRepository).deleteById(10L);
        order.verify(fileStorageService).delete(VIDEO_URL);
    }

    // ---------- dữ liệu giả ----------

    private static User user(Long id) {
        return User.builder().id(id).username("user" + id).email("user" + id + "@vsa.local")
                .passwordHash("x").build();
    }

    private static Video video(Long id, Long ownerId, VideoStatus status) {
        return Video.builder().id(id).title("Video " + id).videoUrl(VIDEO_URL)
                .status(status).owner(user(ownerId)).build();
    }
}
