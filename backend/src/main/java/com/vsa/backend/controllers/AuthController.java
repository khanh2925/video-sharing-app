package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.LoginRequest;
import com.vsa.backend.dtos.request.RegisterRequest;
import com.vsa.backend.dtos.response.AuthResponse;
import com.vsa.backend.dtos.response.AuthUserResponse;
import com.vsa.backend.services.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * API tài khoản. Controller chỉ nhận request, gọi service, trả kết quả; KHÔNG viết nghiệp vụ ở đây.
 *  POST /api/auth/register  (công khai)  → 201 + {token, user}
 *  POST /api/auth/login     (công khai)  → 200 + {token, user}
 *  GET  /api/auth/me        (cần token)  → 200 + user
 * Quyền truy cập đã khai báo trong SecurityConfig.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public AuthUserResponse me() {
        return authService.getCurrentUser();
    }
}
