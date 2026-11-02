package com.vsa.backend.security;

import com.vsa.backend.entities.User;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.services.AdminService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Chạy trước mọi request. Nếu header có "Authorization: Bearer <token>" hợp lệ
 * thì đánh dấu request là "đã đăng nhập" với principal = id người dùng (Long)
 * và quyền ROLE_USER hoặc ROLE_ADMIN.
 * Token sai, hết hạn, hoặc tài khoản bị khoá → coi như chưa đăng nhập (API cần đăng nhập sẽ trả 401).
 * Tài khoản bị khoá: ghi lý do vào request (AUTH_ERROR) để 401 báo rõ "đã bị khóa", app hiện cho người dùng biết.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    /** Tên thuộc tính request chứa lý do từ chối token; SecurityConfig đọc để ghi vào lỗi 401. */
    public static final String AUTH_ERROR = "vsa.authError";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Long userId = jwtService.getUserId(token);
                User user = userRepository.findById(userId).orElse(null);

                // R2: tài khoản bị khoá bị từ chối dù token còn hạn
                if (user != null && !user.isLocked()) {
                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                    var authentication = new UsernamePasswordAuthenticationToken(user.getId(), null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else if (user != null) {
                    request.setAttribute(AUTH_ERROR, AdminService.LOCKED_MESSAGE);
                }
            } catch (JwtException | IllegalArgumentException e) {
                // Token không hợp lệ: bỏ qua, request đi tiếp như khách
            }
        }

        filterChain.doFilter(request, response);
    }
}
