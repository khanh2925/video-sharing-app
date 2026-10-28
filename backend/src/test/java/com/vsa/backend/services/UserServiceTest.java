package com.vsa.backend.services;

import com.vsa.backend.dtos.response.UserProfileResponse;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Test UC06 không cần MySQL: repository là đồ giả (mock) của Mockito.
 * Dữ liệu giả giống DataSeeder: lan (id 2) theo dõi minh (id 3).
 * Chạy: chuột phải file → Run 'UserServiceTest'.
 */
class UserServiceTest {

    private static final Long LAN = 2L;
    private static final Long MINH = 3L;

    private UserRepository userRepository;
    private FollowRepository followRepository;
    private VideoRepository videoRepository;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        followRepository = mock(FollowRepository.class);
        videoRepository = mock(VideoRepository.class);
        userService = new UserService(userRepository, followRepository, videoRepository, new UserMapper());

        when(userRepository.findById(MINH)).thenReturn(Optional.of(taoUser(MINH, "minh")));
        when(userRepository.findById(LAN)).thenReturn(Optional.of(taoUser(LAN, "lan")));
        when(followRepository.countByFollowerId(MINH)).thenReturn(1L);      // minh theo dõi 1 người
        when(followRepository.countByFollowingId(MINH)).thenReturn(2L);     // 2 người theo dõi minh
        when(videoRepository.sumLikeCountByOwner(MINH, VideoStatus.PUBLISHED)).thenReturn(5L);
        when(followRepository.existsByFollowerIdAndFollowingId(LAN, MINH)).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ---------- UC06 ----------

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

    // Giả lập "đã đăng nhập" giống JwtAuthFilter: principal là id người dùng
    private static void dangNhapLa(Long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, null, List.of()));
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
}
