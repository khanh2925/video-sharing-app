package com.vsa.backend.entities;

import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.utils.AppConstants;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/** Video người dùng đăng. File .mp4 nằm trên server, ở đây chỉ lưu đường dẫn. */
@Entity
@Table(name = "videos", indexes = @Index(name = "idx_videos_trending", columnList = "trending_score"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = AppConstants.VIDEO_TITLE_MAX)
    private String title;

    @Column(length = AppConstants.VIDEO_DESCRIPTION_MAX)
    private String description;

    @Column(nullable = false)
    private String videoUrl;

    private String thumbnailUrl;

    // tên bộ lọc màu đã chọn lúc quay
    @Column(length = AppConstants.VIDEO_FILTER_MAX)
    private String filter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private Visibility visibility = Visibility.PUBLIC;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private VideoStatus status = VideoStatus.PUBLISHED;

    @Builder.Default
    private boolean allowComments = true;

    // các bộ đếm lưu sẵn để không phải COUNT mỗi lần mở feed
    @Builder.Default
    private long viewCount = 0;

    @Builder.Default
    private long likeCount = 0;

    @Builder.Default
    private long commentCount = 0;

    // điểm xu hướng: TrendingScoreService tính lại định kỳ từ hành vi người dùng (bảng user_events)
    @Builder.Default
    @Column(nullable = false)
    private double trendingScore = 0;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    // có thể null
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    // nhạc nền, có thể null
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audio_id")
    private Audio audio;

    // nhiều-nhiều: tạo bảng trung gian video_hashtags
    @ManyToMany
    @JoinTable(name = "video_hashtags",
            joinColumns = @JoinColumn(name = "video_id"),
            inverseJoinColumns = @JoinColumn(name = "hashtag_id"))
    @Builder.Default
    private Set<Hashtag> hashtags = new HashSet<>();
}
