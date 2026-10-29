package com.vsa.backend.services;

import com.vsa.backend.configurations.AppProperties;
import com.vsa.backend.dtos.response.FollowUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.entities.Follow;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.Role;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.UserRepository;
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
 * Test UC12 không cần MySQL. Dữ liệu giả giống DataSeeder:
 * lan (2) theo dõi minh (3), hoa (4); minh và an (5) theo dõi lan.
 */
class FollowServiceTest {

    private static final Long LAN = 2L;
    private static final Long MINH = 3L;
    private static final Long HOA = 4L;
    private static final Long AN = 5L;
    private static final Pageable PAGE = PageRequest.of(0, 20);

    private FollowRepository followRepository;
    private UserRepository userRepository;
    private FollowService followService;

    @BeforeEach
    void setUp() {
        followRepository = mock(FollowRepository.class);
        userRepository = mock(UserRepository.class);
        AppProperties appProperties = new AppProperties(null, null, null, null,
                new AppProperties.PagingSettings(20, 10, 10));
        followService = new FollowService(followRepository, userRepository, new UserMapper(), appProperties);

        when(userRepository.findById(AN)).thenReturn(Optional.of(taoUser(AN, "an")));
        when(userRepository.getReferenceById(LAN)).thenReturn(taoUser(LAN, "lan"));
        when(userRepository.existsById(LAN)).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ---------- Theo dõi / bỏ theo dõi ----------

    @Test
    void follow_thanhCong_luuQuanHeTheoDoi() {
        dangNhapLa(LAN);

        followService.follow(AN);

        verify(followRepository).save(argThat(f ->
                f.getFollower().getId().equals(LAN) && f.getFollowing().getId().equals(AN)));
    }

    @Test
    void follow_chinhMinh_bao400() {
        dangNhapLa(LAN);

        ApiException e = assertThrows(ApiException.class, () -> followService.follow(LAN));

        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
        assertEquals("Bạn không thể tự theo dõi chính mình", e.getMessage());
        verify(followRepository, never()).save(any());
    }

    @Test
    void follow_daTheoDoi_bao409() {
        dangNhapLa(LAN);
        when(followRepository.existsByFollowerIdAndFollowingId(LAN, AN)).thenReturn(true);

        ApiException e = assertThrows(ApiException.class, () -> followService.follow(AN));

        assertEquals(HttpStatus.CONFLICT, e.getStatus());
        verify(followRepository, never()).save(any());
    }

    @Test
    void follow_nguoiKhongTonTai_bao404() {
        dangNhapLa(LAN);
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> followService.follow(999L));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    @Test
    void follow_chuaDangNhap_bao401() {
        ApiException e = assertThrows(ApiException.class, () -> followService.follow(AN));

        assertEquals(HttpStatus.UNAUTHORIZED, e.getStatus());
    }

    @Test
    void unfollow_thanhCong_xoaQuanHe() {
        dangNhapLa(LAN);
        Follow follow = taoFollow(LAN, MINH);
        when(followRepository.findByFollowerIdAndFollowingId(LAN, MINH)).thenReturn(Optional.of(follow));

        followService.unfollow(MINH);

        verify(followRepository).delete(follow);
    }

    @Test
    void unfollow_chuaTheoDoi_bao404() {
        dangNhapLa(LAN);
        when(followRepository.findByFollowerIdAndFollowingId(LAN, AN)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> followService.unfollow(AN));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        assertEquals("Bạn chưa theo dõi người này", e.getMessage());
    }

    // ---------- Danh sách followers / following ----------

    @Test
    void getFollowing_chinhMinhXem_tatCaFollowingTrue() {
        dangNhapLa(LAN);
        when(followRepository.findByFollowerIdOrderByCreatedAtDesc(LAN, PAGE))
                .thenReturn(new PageImpl<>(List.of(taoFollow(LAN, MINH), taoFollow(LAN, HOA))));
        when(followRepository.findFollowingIdsIn(LAN, List.of(MINH, HOA))).thenReturn(Set.of(MINH, HOA));

        PageResponse<FollowUserResponse> page = followService.getFollowing(LAN, PAGE);

        assertEquals(List.of("minh", "hoa"), page.content().stream().map(FollowUserResponse::username).toList());
        assertTrue(page.content().stream().allMatch(FollowUserResponse::following));
        assertTrue(page.content().stream().noneMatch(FollowUserResponse::me));
    }

    @Test
    void getFollowers_khachXem_followingFalse_khongHoiDb() {
        when(followRepository.findByFollowingIdOrderByCreatedAtDesc(LAN, PAGE))
                .thenReturn(new PageImpl<>(List.of(taoFollow(MINH, LAN), taoFollow(AN, LAN))));

        PageResponse<FollowUserResponse> page = followService.getFollowers(LAN, PAGE);

        assertEquals(List.of("minh", "an"), page.content().stream().map(FollowUserResponse::username).toList());
        assertTrue(page.content().stream().noneMatch(FollowUserResponse::following));
        verify(followRepository, never()).findFollowingIdsIn(anyLong(), anyCollection());
    }

    @Test
    void getFollowers_nguoiKhongTonTai_bao404() {
        ApiException e = assertThrows(ApiException.class, () -> followService.getFollowers(999L, PAGE));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        verify(followRepository, never()).findByFollowingIdOrderByCreatedAtDesc(anyLong(), any());
    }

    // ---------- Gợi ý ----------

    @Test
    void getSuggestions_layNguoiChuaTheoDoi_theoSoLuongCauHinh() {
        dangNhapLa(LAN);
        when(userRepository.findSuggestions(LAN, Role.USER, PageRequest.of(0, 10)))
                .thenReturn(List.of(taoUser(AN, "an")));

        List<FollowUserResponse> suggestions = followService.getSuggestions();

        assertEquals(1, suggestions.size());
        assertEquals("an", suggestions.get(0).username());
        assertFalse(suggestions.get(0).following());
    }

    // ---------- Hàm phụ ----------

    private static void dangNhapLa(Long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, null, List.of()));
    }

    private static User taoUser(Long id, String username) {
        return User.builder().id(id).username(username).email(username + "@vsa.local")
                .displayName(username).passwordHash("hash").build();
    }

    private static Follow taoFollow(Long followerId, Long followingId) {
        String[] names = {"", "admin", "lan", "minh", "hoa", "an"};
        return Follow.builder()
                .follower(taoUser(followerId, names[followerId.intValue()]))
                .following(taoUser(followingId, names[followingId.intValue()]))
                .build();
    }
}
