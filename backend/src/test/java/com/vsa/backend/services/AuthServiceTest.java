package com.vsa.backend.services;

import com.vsa.backend.dtos.request.LoginRequest;
import com.vsa.backend.dtos.request.RegisterRequest;
import com.vsa.backend.dtos.response.AuthResponse;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.Role;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test AuthService không cần MySQL: repository và JwtService là đồ giả (mock) của Mockito.
 * Chạy: chuột phải file → Run 'AuthServiceTest'.
 * Mẫu cho Long, Thanh viết test service của mình: mỗi use case 1 test đường đi chính + ít nhất 1 test lỗi.
 */
class AuthServiceTest {

    private UserRepository userRepository;
    private JwtService jwtService;
    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        jwtService = mock(JwtService.class);
        passwordEncoder = new BCryptPasswordEncoder();   // dùng thật để kiểm tra băm mật khẩu
        authService = new AuthService(userRepository, passwordEncoder, jwtService, new UserMapper());

        when(jwtService.generateToken(any(User.class))).thenReturn("token-gia");
    }

    // ---------- UC01 ----------

    @Test
    void register_thanhCong_luuMatKhauDaBam_vaTraToken() {
        when(userRepository.existsByUsername("lan2")).thenReturn(false);
        when(userRepository.existsByEmail("lan2@gmail.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.register(
                new RegisterRequest(" Lan2 ", "Lan", "LAN2@gmail.com", "123456", "123456"));

        assertEquals("token-gia", response.token());
        assertEquals("lan2", response.user().username());          // đã trim + viết thường
        assertEquals("lan2@gmail.com", response.user().email());
        assertEquals(Role.USER, response.user().role());

        verify(userRepository).save(argThat(user ->
                !user.getPasswordHash().equals("123456")             // không lưu mật khẩu gốc
                        && passwordEncoder.matches("123456", user.getPasswordHash())));
    }

    @Test
    void register_trungTenDangNhap_bao409() {
        when(userRepository.existsByUsername("lan")).thenReturn(true);

        ApiException e = assertThrows(ApiException.class, () -> authService.register(
                new RegisterRequest("lan", "Lan", "moi@gmail.com", "123456", "123456")));

        assertEquals(HttpStatus.CONFLICT, e.getStatus());
        assertEquals("Tên đăng nhập đã tồn tại", e.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_matKhauNhapLaiKhongKhop_bao400() {
        ApiException e = assertThrows(ApiException.class, () -> authService.register(
                new RegisterRequest("moi", "Moi", "moi@gmail.com", "123456", "654321")));

        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
        verify(userRepository, never()).save(any());
    }

    // ---------- UC02 ----------

    @Test
    void login_bangEmail_thanhCong() {
        User lan = taoUser("lan", "lan@vsa.local", "123456", false);
        when(userRepository.findByEmail("lan@vsa.local")).thenReturn(Optional.of(lan));

        AuthResponse response = authService.login(new LoginRequest("Lan@vsa.local", "123456"));

        assertEquals("token-gia", response.token());
        assertEquals("lan", response.user().username());
    }

    @Test
    void login_saiMatKhau_bao401() {
        User lan = taoUser("lan", "lan@vsa.local", "123456", false);
        when(userRepository.findByUsername("lan")).thenReturn(Optional.of(lan));

        ApiException e = assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("lan", "sai-mat-khau")));

        assertEquals(HttpStatus.UNAUTHORIZED, e.getStatus());
        assertEquals("Tên đăng nhập hoặc mật khẩu không đúng", e.getMessage());
    }

    @Test
    void login_taiKhoanBiKhoa_bao403() {
        User an = taoUser("an", "an@vsa.local", "123456", true);
        when(userRepository.findByUsername("an")).thenReturn(Optional.of(an));

        ApiException e = assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("an", "123456")));

        assertEquals(HttpStatus.FORBIDDEN, e.getStatus());
        assertEquals("Tài khoản đã bị khóa", e.getMessage());
    }

    private User taoUser(String username, String email, String rawPassword, boolean locked) {
        return User.builder()
                .id(1L)
                .username(username)
                .email(email)
                .displayName(username)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(Role.USER)
                .locked(locked)
                .build();
    }
}
