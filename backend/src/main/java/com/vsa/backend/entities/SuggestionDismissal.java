package com.vsa.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * UC12: user bấm X ở một gợi ý "Gợi ý cho bạn" → lưu lại để lần sau không gợi ý người đó nữa
 * (trước đây chỉ ẩn trên máy, mở lại app là hiện lại). Mỗi cặp chỉ có một dòng.
 */
@Entity
@Table(name = "suggestion_dismissals",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "dismissed_user_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SuggestionDismissal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // người bấm X
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    // người bị ẩn khỏi gợi ý
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dismissed_user_id")
    private User dismissedUser;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
