package com.vsa.backend.services;

import com.vsa.backend.dtos.request.LoginRequest;
import com.vsa.backend.dtos.request.RegisterRequest;
import com.vsa.backend.dtos.response.AuthResponse;
import com.vsa.backend.dtos.response.AuthUserResponse;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.Role;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.security.JwtService;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Nghiệp vụ tài khoản: UC01 đăng ký, UC02 đăng nhập, lấy người đang đăng nhập.
 * UC03 đăng xuất không có API: JWT không lưu ở server, app chỉ cần xoá token.
 *
 * Mẫu chung cho các service khác:
 *  1. Chuẩn hoá dữ liệu vào (trim, viết thường...)
 *  2. Kiểm tra nghiệp vụ, sai thì throw ApiException.xxx("câu báo lỗi")
 *  3. Thao tác repository
 *  4. Đổi entity sang DTO bằng mapper rồi trả về
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    /** UC01. Tạo tài khoản vai trò USER rồi đăng nhập luôn (trả token). */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = normalize(request.username());
        String email = normalize(request.email());

        if (!request.password().equals(request.confirmPassword())) {
            throw ApiException.badRequest("Mật khẩu nhập lại không khớp");
        }
        if (userRepository.existsByUsername(username)) {
            throw ApiException.conflict("Tên đăng nhập đã tồn tại");
        }
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("Email đã được sử dụng");
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .displayName(request.displayName().trim())
                .passwordHash(passwordEncoder.encode(request.password()))   // R1: lưu dạng băm BCrypt
                .role(Role.USER)
                .build();
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    /** UC02. Đăng nhập bằng tên đăng nhập hoặc email (R2). */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String identifier = normalize(request.usernameOrEmail());

        // Có ký tự @ thì coi là email, không thì là tên đăng nhập
        User user = (identifier.contains("@")
                ? userRepository.findByEmail(identifier)
                : userRepository.findByUsername(identifier))
                .orElse(null);

        // Sai tài khoản hay sai mật khẩu đều báo chung một câu, để người ngoài không dò được tài khoản nào tồn tại
        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Tên đăng nhập hoặc mật khẩu không đúng");
        }
        if (user.isLocked()) {
            throw ApiException.forbidden("Tài khoản đã bị khóa");
        }

        return buildAuthResponse(user);
    }

    /** GET /api/auth/me: thông tin người đang đăng nhập (app gọi khi mở lại để kiểm tra token còn dùng được). */
    @Transactional(readOnly = true)
    public AuthUserResponse getCurrentUser() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));
        return userMapper.toAuthUserResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, userMapper.toAuthUserResponse(user));
    }

    // Tên đăng nhập và email không phân biệt hoa thường: "Lan" và "lan" là một
    private static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
