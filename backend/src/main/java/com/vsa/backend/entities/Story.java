package com.vsa.backend.entities;

import com.vsa.backend.enums.MediaType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Story: ảnh hoặc video ngắn, tự ẩn sau 24 giờ. */
@Entity
@Table(name = "stories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Story {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String mediaUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MediaType mediaType;

    // video tối đa theo cấu hình STORY_MAX_DURATION_SEC (admin chỉnh được), ảnh để 0
    private int durationSec;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // createdAt + STORY_LIFETIME_HOURS (admin chỉnh được), gán ở service lúc tạo
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    // nhạc nền (không bắt buộc), phát khi xem story
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_id")
    private Audio audio;

    // mappedBy: khoá ngoại nằm ở bảng story_views; xoá story thì xoá luôn lượt xem
    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StoryView> views = new ArrayList<>();
}
