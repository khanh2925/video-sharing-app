package com.vsa.backend.security;

import com.vsa.backend.configurations.AppProperties;
import com.vsa.backend.entities.User;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Tạo và đọc JWT.
 * Token chứa: sub = id người dùng, role, thời điểm tạo và hết hạn (mặc định 7 ngày).
 * Ký bằng HMAC-SHA256 với khoá bí mật trong application.yaml (app.jwt.secret, app.jwt.expiration-days).
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(AppProperties appProperties) {
        var jwt = appProperties.jwt();
        this.key = Keys.hmacShaKeyFor(jwt.secret().getBytes(StandardCharsets.UTF_8));
        this.expirationMs = jwt.expirationDays() * 24L * 60 * 60 * 1000;
    }

    public String generateToken(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * Đọc id người dùng trong token.
     * Ném JwtException nếu token sai chữ ký, bị sửa hoặc đã hết hạn.
     */
    public Long getUserId(String token) throws JwtException {
        String subject = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
        return Long.valueOf(subject);
    }
}
