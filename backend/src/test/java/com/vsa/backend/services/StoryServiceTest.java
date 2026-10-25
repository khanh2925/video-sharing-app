package com.vsa.backend.services;

import com.vsa.backend.dtos.response.StoryGroupResponse;
import com.vsa.backend.dtos.response.StoryResponse;
import com.vsa.backend.entities.Story;
import com.vsa.backend.entities.StoryView;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.MediaType;
import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.StoryMapper;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.StoryRepository;
import com.vsa.backend.repositories.StoryViewRepository;
import com.vsa.backend.repositories.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Test UC17–UC18. Người đang đăng nhập giả lập là user id 1. */
class StoryServiceTest {

    private static final Long ME = 1L;

    private StoryRepository storyRepository;
    private StoryViewRepository storyViewRepository;
    private FollowRepository followRepository;
    private UserRepository userRepository;
    private FileStorageService fileStorageService;
    private SystemSettingService systemSettingService;
    private StoryService storyService;

    @BeforeEach
    void setUp() {
        storyRepository = mock(StoryRepository.class);
        storyViewRepository = mock(StoryViewRepository.class);
        followRepository = mock(FollowRepository.class);
        userRepository = mock(UserRepository.class);
        fileStorageService = mock(FileStorageService.class);
        systemSettingService = mock(SystemSettingService.class);

        storyService = new StoryService(storyRepository, storyViewRepository, followRepository, userRepository,
                fileStorageService, systemSettingService, new StoryMapper(), new UserMapper());

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(ME, null, List.of()));

        when(userRepository.findById(ME)).thenReturn(Optional.of(user(ME)));
        when(systemSettingService.getInt(SettingKey.STORY_MAX_DURATION_SEC)).thenReturn(15);
        when(systemSettingService.getInt(SettingKey.STORY_LIFETIME_HOURS)).thenReturn(24);
        when(storyRepository.saveAndFlush(any(Story.class))).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ---------- UC17 ----------

    @Test
    void create_anh_hetHanSauSoGioCauHinh() {
        MockMultipartFile image = new MockMultipartFile("file", "a.jpg", "image/jpeg", new byte[]{1});
        when(fileStorageService.isVideo(image)).thenReturn(false);
        when(fileStorageService.saveStoryFile(image)).thenReturn("/files/stories/a.jpg");

        StoryResponse response = storyService.create(image, null);

        assertEquals(MediaType.IMAGE, response.mediaType());
        assertEquals(0, response.durationSec());
        LocalDateTime expected = LocalDateTime.now().plusHours(24);
        assertTrue(response.expiresAt().isAfter(expected.minusMinutes(1))
                && response.expiresAt().isBefore(expected.plusMinutes(1)));
    }

    @Test
    void create_videoDaiHonGioiHan_bao400_vaKhongLuuFile() {
        MockMultipartFile clip = new MockMultipartFile("file", "a.mp4", "video/mp4", new byte[]{1});
        when(fileStorageService.isVideo(clip)).thenReturn(true);

        ApiException e = assertThrows(ApiException.class, () -> storyService.create(clip, 20));

        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
        assertEquals("Video story tối đa 15 giây", e.getMessage());
        verify(fileStorageService, never()).saveStoryFile(any());
    }

    @Test
    void delete_storyNguoiKhac_bao403() {
        when(storyRepository.findById(5L)).thenReturn(Optional.of(story(5L, 2L)));

        ApiException e = assertThrows(ApiException.class, () -> storyService.delete(5L));

        assertEquals(HttpStatus.FORBIDDEN, e.getStatus());
    }

    // ---------- UC18 ----------

    @Test
    void getFeed_cuaToiTruoc_chuaXemTruoc_daXemHetSau() {
        Story mine = story(1L, ME);
        Story ofUser2 = story(2L, 2L);     // đã xem
        Story ofUser3 = story(3L, 3L);     // chưa xem
        when(followRepository.findFollowingIds(ME)).thenReturn(List.of(2L, 3L));
        when(storyRepository.findByOwnerIdInAndExpiresAtAfterOrderByCreatedAtAsc(anyCollection(), any()))
                .thenReturn(List.of(ofUser2, ofUser3, mine));
        when(storyViewRepository.findViewedStoryIds(eq(ME), anyCollection())).thenReturn(List.of(2L));

        List<StoryGroupResponse> feed = storyService.getFeed();

        assertEquals(3, feed.size());
        assertTrue(feed.get(0).mine());
        assertEquals(3L, feed.get(1).owner().id());
        assertFalse(feed.get(1).allViewed());   // viền xanh
        assertEquals(2L, feed.get(2).owner().id());
        assertTrue(feed.get(2).allViewed());    // viền xám
    }

    @Test
    void markViewed_storyCuaMinh_khongGhiLuotXem() {
        when(storyRepository.findById(1L)).thenReturn(Optional.of(story(1L, ME)));

        storyService.markViewed(1L);

        verify(storyViewRepository, never()).save(any(StoryView.class));
    }

    @Test
    void markViewed_storyHetHan_bao404() {
        Story expired = story(7L, 2L);
        expired.setExpiresAt(LocalDateTime.now().minusHours(1));
        when(storyRepository.findById(7L)).thenReturn(Optional.of(expired));

        ApiException e = assertThrows(ApiException.class, () -> storyService.markViewed(7L));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    // ---------- dữ liệu giả ----------

    private static User user(Long id) {
        return User.builder().id(id).username("user" + id).email("user" + id + "@vsa.local")
                .passwordHash("x").build();
    }

    private static Story story(Long id, Long ownerId) {
        return Story.builder().id(id).mediaUrl("/files/stories/" + id + ".jpg").mediaType(MediaType.IMAGE)
                .createdAt(LocalDateTime.now().minusHours(id))
                .expiresAt(LocalDateTime.now().plusHours(10))
                .owner(user(ownerId)).build();
    }
}
