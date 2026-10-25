package com.vsa.backend.entities;

import com.vsa.backend.enums.Role;
import com.vsa.backend.utils.AppConstants;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Người dùng của ứng dụng (cả người dùng thường và quản trị viên). */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = AppConstants.USERNAME_MAX)
    private String username;

    @Column(nullable = false, unique = true, length = AppConstants.EMAIL_MAX)
    private String email;

    // mã hoá BCrypt, không bao giờ trả ra API
    @Column(nullable = false)
    private String passwordHash;

    @Column(length = AppConstants.DISPLAY_NAME_MAX)
    private String displayName;

    @Column(length = AppConstants.BIO_MAX)
    private String bio;

    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Role role = Role.USER;

    // true = bị quản trị viên khoá
    @Column(nullable = false)
    @Builder.Default
    private boolean locked = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
