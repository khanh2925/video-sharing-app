package com.vsa.backend.utils;

import com.vsa.backend.exceptions.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Lấy người dùng đang gọi API (do JwtAuthFilter gắn vào).
 * Dùng trong service, vd: {@code Long currentUserId = SecurityUtils.getCurrentUserId();}
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /** Id người đang đăng nhập; chưa đăng nhập thì ném 401. Dùng cho API bắt buộc đăng nhập. */
    public static Long getCurrentUserId() {
        Long id = getCurrentUserIdOrNull();
        if (id == null) {
            throw ApiException.unauthorized("Bạn cần đăng nhập");
        }
        return id;
    }

    /** Id người đang đăng nhập, hoặc null nếu là khách. Dùng cho API công khai nhưng hiển thị khác khi đã đăng nhập. */
    public static Long getCurrentUserIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long id) {
            return id;
        }
        return null;
    }

    public static boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
