package com.vsa.backend.configurations;

import com.vsa.backend.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Phân quyền cho toàn bộ API (mục 3.7 tài liệu):
 * - Đọc nội dung công khai (GET) không cần đăng nhập.
 * - Ghi (POST/PUT/DELETE) cần JWT.
 * - /api/admin/** cần vai trò ADMIN.
 * Chỉ Khánh sửa file này; ai cần mở thêm đường dẫn thì báo nhóm trưởng.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())                     // API dùng JWT, không dùng cookie nên tắt CSRF
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> writeError(res, 401, "Bạn cần đăng nhập"))
                        .accessDeniedHandler((req, res, ex) -> writeError(res, 403, "Bạn không có quyền thực hiện thao tác này")))
                .authorizeHttpRequests(auth -> auth
                        // Đăng ký / đăng nhập, kiểm tra hệ thống, file tĩnh, WebSocket
                        .requestMatchers("/api/auth/register", "/api/auth/login", "/api/health").permitAll()
                        .requestMatchers("/files/**", "/ws/**", "/error").permitAll()
                        // Quản trị
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // Các GET cần đăng nhập (phải khai báo TRƯỚC dòng GET permitAll bên dưới)
                        .requestMatchers(HttpMethod.GET,
                                "/api/auth/me", "/api/videos/me/**", "/api/users/suggestions", "/api/stories/**")
                        .authenticated()
                        // Còn lại: GET công khai, mọi thứ khác cần đăng nhập
                        .requestMatchers(HttpMethod.GET, "/api/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Cho phép gọi API từ Expo web / trình duyệt khi dev (app điện thoại thì không cần CORS)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // Lỗi 401/403 xảy ra ở tầng filter (trước controller) nên tự ghi JSON cùng định dạng ErrorResponse
    private static void writeError(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message
                + "\",\"timestamp\":\"" + LocalDateTime.now() + "\"}");
    }
}
