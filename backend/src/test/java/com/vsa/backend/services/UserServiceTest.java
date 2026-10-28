package com.vsa.backend.services;

import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.UserProfileResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.entities.VideoLike;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.CatalogMapper;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoLikeRepository;
import com.vsa.backend.repositories.VideoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test UC06 không cần MySQL: repository là đồ giả (mock) của Mockito.
 * Dữ liệu giả giống DataSeeder: lan (id 2) theo dõi minh (id 3).
 * Chạy: chuột phải file → Run 'UserServiceTest'.
 */
class UserServiceTest {

    private static final Long LAN = 2L;
    private static final Long MINH = 3L;
    private static final Pageable PAGE = PageRequest.of(0, 12);

    private UserRepository userRepository;
    private FollowRepository followRepository;
    private VideoRepository videoRepository;
    private VideoLikeRepository videoLikeRepository;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        followRepository = mock(FollowRepository.class);
        videoRepository = mock(VideoRepository.class);
        videoLikeRepository = mock(VideoLikeRepository.class);
        VideoMapper videoMapper = new VideoMapper(new UserMapper(), new CatalogMapper());
        userService = new UserService(userRepository, followRepository, videoRepository,
                videoLikeRepository, new UserMapper(), videoMapper);

        when(userRepository.findById(MINH)).thenReturn(Optional.of(taoUser(MINH, "minh")));
        when(userRepository.findById(LAN)).thenReturn(Optional.of(taoUser(LAN, "lan")));
        when(userRepository.existsById(MINH)).thenReturn(true);
        when(userRepository.existsById(LAN)).thenReturn(true);
        when(followRepository.countByFollowerId(MINH)).thenReturn(1L);      // minh theo dõi 1 người
        when(followRepository.countByFollowingId(MINH)).thenReturn(2L);     // 2 người theo dõi minh
        when(videoRepository.sumLikeCountByOwner(MINH, VideoStatus.PUBLISHED)).thenReturn(5L);
        when(followRepository.existsByFollowerIdAndFollowingId(LAN, MINH)).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ---------- UC06: hồ sơ ----------

    @Test
    void getProfile_khach_xemDuoc_followingVaMeDeuFalse() {
        UserProfileResponse profile = userService.getProfile(MINH);

        assertEquals("minh", profile.username());
        assertEquals(1L, profile.followingCount());
        assertEquals(2L, profile.followerCount());
        assertEquals(5L, profile.likeCount());
        assertFalse(profile.following());
        assertFalse(profile.me());
        // khách thì không cần hỏi DB "có đang theo dõi không"
        verify(followRepository, never()).existsByFollowerIdAndFollowingId(anyLong(), anyLong());
    }

    @Test
    void getProfile_dangTheoDoi_followingTrue() {
        dangNhapLa(LAN);

        UserProfileResponse profile = userService.getProfile(MINH);

        assertTrue(profile.following());
        assertFalse(profile.me());
    }

    @Test
    void getProfile_hoSoCuaChinhMinh_meTrue() {
        dangNhapLa(LAN);

        UserProfileResponse profile = userService.getProfile(LAN);

        assertTrue(profile.me());
        assertFalse(profile.following());
        verify(followRepository, never()).existsByFollowerIdAndFollowingId(anyLong(), anyLong());
    }

    @Test
    void getProfile_khongTonTai_bao404() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> userService.getProfile(999L));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        assertEquals("Không tìm thấy người dùng id = 999", e.getMessage());
    }

    // ---------- UC06: tab Videos ----------

    @Test
    void getUserVideos_khach_chiLayVideoCongKhai() {
        traVeVideoCuaMinh(video(10L, MINH));

        PageResponse<VideoResponse> page = userService.getUserVideos(MINH, PAGE);

        assertEquals(1, page.content().size());
        assertFalse(page.content().get(0).liked());
        verify(videoRepository).findByOwnerIdAndStatusAndVisibilityInOrderByCreatedAtDesc(
                MINH, VideoStatus.PUBLISHED, List.of(Visibility.PUBLIC), PAGE);
        // khách chưa thích video nào → khỏi hỏi DB
        verify(videoLikeRepository, never()).findLikedVideoIds(anyLong(), anyCollection());
    }

    @Test
    void getUserVideos_nguoiTheoDoi_thayThemVideoFollowers_vaBietDaThich() {
        dangNhapLa(LAN);
        traVeVideoCuaMinh(video(10L, MINH));
        when(videoLikeRepository.findLikedVideoIds(LAN, List.of(10L))).thenReturn(Set.of(10L));

        PageResponse<VideoResponse> page = userService.getUserVideos(MINH, PAGE);

        assertTrue(page.content().get(0).liked());
        verify(videoRepository).findByOwnerIdAndStatusAndVisibilityInOrderByCreatedAtDesc(
                MINH, VideoStatus.PUBLISHED, List.of(Visibility.PUBLIC, Visibility.FOLLOWERS), PAGE);
    }

    @Test
    void getUserVideos_chuHoSo_thayCaVideoRiengTu() {
        dangNhapLa(MINH);
        traVeVideoCuaMinh(video(10L, MINH));

        userService.getUserVideos(MINH, PAGE);

        verify(videoRepository).findByOwnerIdAndStatusAndVisibilityInOrderByCreatedAtDesc(
                MINH, VideoStatus.PUBLISHED, List.of(Visibility.values()), PAGE);
    }

    @Test
    void getUserVideos_userKhongTonTai_bao404() {
        ApiException e = assertThrows(ApiException.class, () -> userService.getUserVideos(999L, PAGE));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        verifyNoInteractions(videoRepository);
    }

    // ---------- UC06: tab Liked ----------

    @Test
    void getLikedVideos_khach_traVideoLanDaThich() {
        VideoLike like = VideoLike.builder().user(taoUser(LAN, "lan")).video(video(20L, MINH)).build();
        when(videoLikeRepository.findVisibleLikes(eq(LAN), isNull(), eq(VideoStatus.PUBLISHED),
                eq(Visibility.PUBLIC), eq(Visibility.FOLLOWERS), eq(PAGE)))
                .thenReturn(new PageImpl<>(List.of(like)));

        PageResponse<VideoResponse> page = userService.getLikedVideos(LAN, PAGE);

        assertEquals(1, page.content().size());
        assertEquals(20L, page.content().get(0).id());
        assertFalse(page.content().get(0).liked());          // khách xem → không tô đỏ trái tim
    }

    @Test
    void getLikedVideos_userKhongTonTai_bao404() {
        ApiException e = assertThrows(ApiException.class, () -> userService.getLikedVideos(999L, PAGE));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        verifyNoInteractions(videoLikeRepository);
    }

    // ---------- Hàm phụ ----------

    // Giả lập "đã đăng nhập" giống JwtAuthFilter: principal là id người dùng
    private static void dangNhapLa(Long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, null, List.of()));
    }

    private void traVeVideoCuaMinh(Video... videos) {
        when(videoRepository.findByOwnerIdAndStatusAndVisibilityInOrderByCreatedAtDesc(
                eq(MINH), eq(VideoStatus.PUBLISHED), anyCollection(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(videos)));
    }

    private static User taoUser(Long id, String username) {
        return User.builder()
                .id(id)
                .username(username)
                .email(username + "@vsa.local")
                .displayName(username)
                .passwordHash("hash")
                .build();
    }

    private static Video video(Long id, Long ownerId) {
        return Video.builder()
                .id(id)
                .title("Video " + id)
                .videoUrl("/files/videos/video" + id + ".mp4")
                .owner(taoUser(ownerId, "user" + ownerId))
                .build();
    }
}
