package com.vsa.backend.ai.tracking;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Một hành vi của người dùng, dùng làm dữ liệu cho gợi ý video.
 * Chỉ ghi thêm, không bao giờ sửa → không có updated_at.
 *
 * user_id, video_id để số thường, KHÔNG đặt khoá ngoại: xoá video thì không phải xoá lịch sử trước,
 * và ghi sự kiện không bao giờ làm hỏng thao tác chính (thích, bình luận...) vì lỗi ràng buộc.
 */
@Entity
@Table(name = "user_events", indexes = {
        @Index(name = "idx_user_events_user_time", columnList = "user_id, created_at"),
        @Index(name = "idx_user_events_video", columnList = "video_id")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Ai làm. Khách thì null: vẫn đếm cho thống kê, nhưng không dùng để cá nhân hoá. */
    @Column(name = "user_id")
    private Long userId;

    /** Video nào. Null với SEARCH. */
    @Column(name = "video_id")
    private Long videoId;

    /** Loại hành vi; mỗi loại một trọng số khi tính sở thích. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EventType eventType;

    /** Đã xem bao nhiêu mili giây. Chia cho durationMs ra tỉ lệ xem hết: xem gần hết = thích thật. */
    private Integer watchMs;

    /** Video dài bao nhiêu mili giây (app gửi kèm WATCH). */
    private Integer durationMs;

    /** Từ khoá tìm kiếm (chỉ với SEARCH): cho biết người dùng đang quan tâm gì. */
    @Column(length = 100)
    private String query;

    /** Lúc xảy ra: sự kiện gần đây được tính nặng hơn sự kiện cũ. */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
