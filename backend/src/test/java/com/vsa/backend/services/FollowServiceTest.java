package com.vsa.backend.services;

import com.vsa.backend.dtos.response.FollowUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.entities.Follow;
import com.vsa.backend.entities.User;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
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
 * Test UC12 Theo dõi, không cần MySQL: repository là đồ giả (mock) của Mockito.
 * Dữ liệu giả: lan (id 2), minh (id 3), an (id 4).
 * Chạy: chuột phải file → Run 'FollowServiceTest'.
 */
class FollowServiceTest {

    private static final Long LAN = 2L;
    private static final Long MINH = 3L;
    private static final Long AN = 4L;
    private static final Pageable PAGE = PageRequest.of(0, 20);

    private FollowRepository followRepository;
    private UserRepository userRepository;
    private FollowService followService;

    @BeforeEach
    void setUp() {
        followRepository = mock(FollowRepository.class);
        userRepository = mock(UserRepository.class);
        followService = new FollowService(followRepository, userRepository, mock(NotificationService.class));

        when(userRepository.findById(MINH)).thenReturn(Optional.of(taoUser(MINH, "minh")));
        when(userRepository.existsById(MINH)).thenReturn(true);
        when(userRepository.getReferenceById(LAN)).thenReturn(taoUser(LAN, "lan"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ---------- Theo dõi / bỏ theo dõi ----------

    @Test
    void follow_chuaTheoDoi_luuMotDong() {
        dangNhapLa(LAN);

        followService.follow(MINH);

        verify(followRepository).save(argThat(f ->
                f.getFollower().getId().equals(LAN) && f.getFollowing().getId().equals(MINH)));
    }

    @Test
    void follow_daTheoDoiRoi_khongLuuThem() {
        dangNhapLa(LAN);
        when(followRepository.existsByFollowerIdAndFollowingId(LAN, MINH)).thenReturn(true);

        followService.follow(MINH);

        verify(followRepository, never()).save(any());
    }

    @Test
    void follow_haiRequestCungLuc_requestSauBiTrungUnique_vanThanhCong() {
        // Cả hai request đều thấy "chưa theo dõi", request sau bị ràng buộc unique chặn khi lưu
        dangNhapLa(LAN);
        when(followRepository.save(any(Follow.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate entry"));

        assertDoesNotThrow(() -> followService.follow(MINH));
    }

    @Test
    void follow_chinhMinh_bi400() {
        dangNhapLa(MINH);

        ApiException e = assertThrows(ApiException.class, () -> followService.follow(MINH));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
    }

    @Test
    void follow_nguoiKhongTonTai_bi404() {
        dangNhapLa(LAN);

        ApiException e = assertThrows(ApiException.class, () -> followService.follow(99L));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    @Test
    void follow_khach_bi401() {
        ApiException e = assertThrows(ApiException.class, () -> followService.follow(MINH));
        assertEquals(HttpStatus.UNAUTHORIZED, e.getStatus());
    }

    @Test
    void unfollow_dangTheoDoi_xoaDong() {
        dangNhapLa(LAN);
        Follow follow = Follow.builder().id(1L).follower(taoUser(LAN, "lan")).following(taoUser(MINH, "minh")).build();
        when(followRepository.findByFollowerIdAndFollowingId(LAN, MINH)).thenReturn(Optional.of(follow));

        followService.unfollow(MINH);

        verify(followRepository).delete(follow);
    }

    @Test
    void unfollow_chuaTheoDoi_khongLoi() {
        dangNhapLa(LAN);
        when(followRepository.findByFollowerIdAndFollowingId(LAN, MINH)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> followService.unfollow(MINH));
        verify(followRepository, never()).delete(any());
    }

    // ---------- Danh sách ----------

    @Test
    void getFollowers_ganCoTheoNguoiDangXem() {
        // lan và an theo dõi minh; lan (đang xem) theo dõi lại an, an cũng theo dõi lan → "Bạn bè"
        dangNhapLa(LAN);
        when(followRepository.findByFollowingIdOrderByCreatedAtDesc(MINH, PAGE)).thenReturn(new PageImpl<>(List.of(
                Follow.builder().follower(taoUser(LAN, "lan")).following(taoUser(MINH, "minh")).build(),
                Follow.builder().follower(taoUser(AN, "an")).following(taoUser(MINH, "minh")).build())));
        when(followRepository.countFollowersAmong(anyCollection())).thenReturn(List.<Object[]>of(new Object[]{AN, 7L}));
        when(followRepository.findFollowingIdsAmong(eq(LAN), anyCollection())).thenReturn(Set.of(AN));
        when(followRepository.findFollowerIdsAmong(eq(LAN), anyCollection())).thenReturn(Set.of(AN));

        PageResponse<FollowUserResponse> page = followService.getFollowers(MINH, PAGE);

        FollowUserResponse lan = page.content().get(0);
        FollowUserResponse an = page.content().get(1);
        assertTrue(lan.me());
        assertEquals(0L, lan.followerCount());
        assertTrue(an.following());
        assertTrue(an.followsMe());
        assertEquals(7L, an.followerCount());
    }

    @Test
    void getFollowing_khach_coDeuFalse_khongHoiDbVeCo() {
        when(followRepository.findByFollowerIdOrderByCreatedAtDesc(MINH, PAGE)).thenReturn(new PageImpl<>(List.of(
                Follow.builder().follower(taoUser(MINH, "minh")).following(taoUser(AN, "an")).build())));
        when(followRepository.countFollowersAmong(anyCollection())).thenReturn(List.of());

        FollowUserResponse an = followService.getFollowing(MINH, PAGE).content().get(0);

        assertFalse(an.following());
        assertFalse(an.followsMe());
        assertFalse(an.me());
        verify(followRepository, never()).findFollowingIdsAmong(any(), anyCollection());
    }

    @Test
    void getFollowers_nguoiKhongTonTai_bi404() {
        ApiException e = assertThrows(ApiException.class, () -> followService.getFollowers(99L, PAGE));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    // ---------- Hàm phụ ----------

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
