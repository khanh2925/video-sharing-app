package com.vsa.backend.services;

import com.vsa.backend.dtos.response.SettingResponse;
import com.vsa.backend.entities.SystemSetting;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.Role;
import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Test UC15, UC16, UC19 (phần quản trị). */
class AdminServiceTest {

    private VideoRepository videoRepository;
    private UserRepository userRepository;
    private SystemSettingService systemSettingService;
    private AdminService adminService;

    @BeforeEach
    void setUp() {
        videoRepository = mock(VideoRepository.class);
        userRepository = mock(UserRepository.class);
        systemSettingService = mock(SystemSettingService.class);
        adminService = new AdminService(videoRepository, userRepository, systemSettingService);
    }

    @Test
    void hideVideo_doiTrangThaiSangHidden() {
        Video video = Video.builder().id(5L).status(VideoStatus.PUBLISHED).build();
        when(videoRepository.findById(5L)).thenReturn(Optional.of(video));

        adminService.hideVideo(5L);

        assertEquals(VideoStatus.HIDDEN, video.getStatus());
    }

    @Test
    void hideVideo_khongTonTai_bao404() {
        when(videoRepository.findById(99L)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> adminService.hideVideo(99L));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    @Test
    void lockUser_roiUnlock() {
        User user = User.builder().id(2L).role(Role.USER).build();
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));

        adminService.lockUser(2L);
        assertTrue(user.isLocked());

        adminService.unlockUser(2L);
        assertFalse(user.isLocked());
    }

    @Test
    void lockUser_khongKhoaDuocAdmin() {
        User admin = User.builder().id(1L).role(Role.ADMIN).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        ApiException e = assertThrows(ApiException.class, () -> adminService.lockUser(1L));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
        assertFalse(admin.isLocked());
    }

    @Test
    void updateSetting_tenKhongTonTai_bao404() {
        ApiException e = assertThrows(ApiException.class, () -> adminService.updateSetting("KHONG_CO", "5"));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        verifyNoInteractions(systemSettingService);
    }

    @Test
    void updateSetting_chuyenChoSystemSettingService() {
        SystemSetting saved = SystemSetting.builder()
                .settingKey(SettingKey.STORY_LIFETIME_HOURS).settingValue("48").description("d").build();
        when(systemSettingService.update(SettingKey.STORY_LIFETIME_HOURS, "48")).thenReturn(saved);

        SettingResponse res = adminService.updateSetting("story_lifetime_hours", "48");

        assertEquals(SettingKey.STORY_LIFETIME_HOURS, res.key());
        assertEquals("48", res.value());
    }
}
