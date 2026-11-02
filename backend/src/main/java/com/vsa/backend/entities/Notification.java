package com.vsa.backend.entities;

import com.vsa.backend.enums.NotificationType;
import com.vsa.backend.utils.AppConstants;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

/**
 * Một thông báo gửi cho recipient (UC20), do actor gây ra.
 * Xoá video / người dùng thì thông báo liên quan tự xoá theo (ON DELETE CASCADE trong DB).
 */
@Entity
@Table(name = "notifications",
        indexes = @Index(name = "idx_notifications_recipient", columnList = "recipient_id, created_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationType type;

    // Video liên quan (thích, bình luận, chia sẻ); theo dõi thì null
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Video video;

    // Nội dung bình luận hoặc lời nhắn khi chia sẻ (cắt ngắn), có thể null
    @Column(length = AppConstants.NOTIFICATION_TEXT_MAX)
    private String text;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
