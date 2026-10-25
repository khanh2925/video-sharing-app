package com.vsa.backend.entities;

import com.vsa.backend.enums.LiveStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Một phiên livestream (kèm sản phẩm giới thiệu trong live). */
@Entity
@Table(name = "live_streams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveStream {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    // video phát lại làm luồng live (MVP không stream camera thật)
    private String sourceVideoUrl;

    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private LiveStatus status = LiveStatus.LIVE;

    @Builder.Default
    private int viewerCount = 0;

    @Column(length = 150)
    private String productName;

    private double productPrice;

    private String productImageUrl;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    // null khi đang live
    private LocalDateTime endedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_id")
    private User host;

    @OneToMany(mappedBy = "liveStream", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LiveMessage> messages = new ArrayList<>();
}
