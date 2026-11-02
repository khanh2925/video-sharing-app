package com.vsa.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

/**
 * Lịch sử xem: mỗi người một dòng cho mỗi video, xem lại thì cập nhật watchedAt (lên đầu danh sách).
 * Xoá video / người dùng thì dòng lịch sử tự xoá theo (ON DELETE CASCADE).
 */
@Entity
@Table(name = "watch_history",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "video_id"}),
        indexes = @Index(name = "idx_watch_history_user", columnList = "user_id, watched_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WatchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Video video;

    @Column(name = "watched_at", nullable = false)
    private LocalDateTime watchedAt;
}
