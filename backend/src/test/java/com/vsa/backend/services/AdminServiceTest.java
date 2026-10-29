package com.vsa.backend.services;

import com.vsa.backend.dtos.request.UpdateSettingRequest;
import com.vsa.backend.dtos.response.AdminUserResponse;
import com.vsa.backend.dtos.response.SettingResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.SystemSetting;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.Role;
import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.AdminMapper;
import com.vsa.backend.mappers.CatalogMapper;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.SystemSettingRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Test UC15, UC16, UC19 không cần MySQL. */
class AdminServiceTest {

    private VideoRepository videoRepository;
    private UserRepository userRepository;
    private SystemSettingRepository systemSettingRepository;
    private SystemSettingService systemSettingService;
    private AdminService adminService;

    @BeforeEach
    void setUp() {
        videoRepository = mock(VideoRepository.class);
        userRepository = mock(UserRepository.class);
        systemSettingRepository = mock(SystemSettingRepository.class);
        systemSettingService = mock(SystemSettingService.class);
        VideoMapper videoMapper = new VideoMapper(new UserMapper(), new CatalogMapper());
        MockEnvironment environment = new MockEnvironment()
                .withProperty("spring.servlet.multipart.max-file-size", "500MB");   // giống application.yaml

        adminService = new AdminService(videoRepository, userRepository, systemSettingRepository,
                systemSettingService, videoMapper, new AdminMapper(), environment);
    }

    // ---------- UC15 ----------

    @Test
    void hideVideo_thanhCong_chuyenSangHidden() {
        Video video = taoVideo(6L, VideoStatus.PUBLISHED);
        when(videoRepository.findById(6L)).thenReturn(Optional.of(video));

        VideoResponse response = adminService.hideVideo(6L);

        assertEquals(VideoStatus.HIDDEN, response.status());
        verify(videoRepository).save(video);              // chỉ đổi trạng thái, không xoá
        verify(videoRepository, never()).delete(any());
    }

    @Test
    void hideVideo_daAnTruocDo_bao409() {
        when(videoRepository.findById(6L)).thenReturn(Optional.of(taoVideo(6L, VideoStatus.HIDDEN)));

        ApiException e = assertThrows(ApiException.class, () -> adminService.hideVideo(6L));

        assertEquals(HttpStatus.CONFLICT, e.getStatus());
    }

    @Test
    void hideVideo_khongTonTai_bao404() {
        when(videoRepository.findById(999L)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> adminService.hideVideo(999L));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    // ---------- UC16 ----------

    @Test
    void lockUser_thanhCong_lockedTrue() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(taoUser(5L, "an", Role.USER, false)));

        AdminUserResponse response = adminService.lockUser(5L);

        assertTrue(response.locked());
        verify(userRepository).save(argThat(u -> u.isLocked()));
    }

    @Test
    void lockUser_taiKhoanQuanTri_bao400() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(taoUser(1L, "admin", Role.ADMIN, false)));

        ApiException e = assertThrows(ApiException.class, () -> adminService.lockUser(1L));

        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
        assertEquals("Không thể khóa tài khoản quản trị", e.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void lockUser_daKhoa_bao409() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(taoUser(5L, "an", Role.USER, true)));

        ApiException e = assertThrows(ApiException.class, () -> adminService.lockUser(5L));

        assertEquals(HttpStatus.CONFLICT, e.getStatus());
    }

    @Test
    void unlockUser_thanhCong_lockedFalse() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(taoUser(5L, "an", Role.USER, true)));

        AdminUserResponse response = adminService.unlockUser(5L);

        assertFalse(response.locked());
    }

    @Test
    void unlockUser_chuaKhoa_bao409() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(taoUser(5L, "an", Role.USER, false)));

        ApiException e = assertThrows(ApiException.class, () -> adminService.unlockUser(5L));

        assertEquals(HttpStatus.CONFLICT, e.getStatus());
        assertEquals("Tài khoản chưa bị khóa", e.getMessage());
    }

    @Test
    void lockUser_khongTonTai_bao404() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> adminService.lockUser(999L));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
    }

    // ---------- UC19 ----------

    @Test
    void updateSetting_thanhCong_khoaVietThuongCungDuoc() {
        SystemSetting setting = SystemSetting.builder().settingKey(SettingKey.STORY_MAX_DURATION_SEC)
                .settingValue("30").description("Story là video dài tối đa (giây)").build();
        when(systemSettingService.update(SettingKey.STORY_MAX_DURATION_SEC, "30")).thenReturn(setting);

        SettingResponse response = adminService.updateSetting("story_max_duration_sec", new UpdateSettingRequest("30"));

        assertEquals(SettingKey.STORY_MAX_DURATION_SEC, response.key());
        assertEquals("30", response.value());
        verify(systemSettingRepository).saveAndFlush(setting);
    }

    @Test
    void updateSetting_khoaKhongTonTai_bao404() {
        ApiException e = assertThrows(ApiException.class,
                () -> adminService.updateSetting("KHONG_CO", new UpdateSettingRequest("30")));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        verify(systemSettingService, never()).update(any(), anyString());
    }

    @Test
    void updateSetting_videoVuotTran500MB_bao400() {
        ApiException e = assertThrows(ApiException.class,
                () -> adminService.updateSetting("VIDEO_MAX_SIZE_MB", new UpdateSettingRequest("600")));

        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
        assertEquals("Dung lượng video tối đa không được vượt quá 500 MB", e.getMessage());
        verify(systemSettingService, never()).update(any(), anyString());
    }

    @Test
    void getSettingValues_duBaThongSo_dungThuTu() {
        when(systemSettingService.getInt(SettingKey.STORY_MAX_DURATION_SEC)).thenReturn(15);
        when(systemSettingService.getInt(SettingKey.STORY_LIFETIME_HOURS)).thenReturn(24);
        when(systemSettingService.getInt(SettingKey.VIDEO_MAX_SIZE_MB)).thenReturn(100);

        Map<SettingKey, Integer> values = adminService.getSettingValues();

        assertEquals(List.of(SettingKey.STORY_MAX_DURATION_SEC, SettingKey.STORY_LIFETIME_HOURS,
                SettingKey.VIDEO_MAX_SIZE_MB), List.copyOf(values.keySet()));
        assertEquals(15, values.get(SettingKey.STORY_MAX_DURATION_SEC));
    }

    // ---------- Hàm phụ ----------

    private static User taoUser(Long id, String username, Role role, boolean locked) {
        return User.builder().id(id).username(username).email(username + "@vsa.local")
                .displayName(username).passwordHash("hash").role(role).locked(locked).build();
    }

    private static Video taoVideo(Long id, VideoStatus status) {
        return Video.builder().id(id).title("Video " + id).videoUrl("/files/videos/video" + id + ".mp4")
                .status(status).owner(taoUser(2L, "lan", Role.USER, false)).build();
    }
}
