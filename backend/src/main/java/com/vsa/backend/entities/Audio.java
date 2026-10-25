package com.vsa.backend.entities;

import jakarta.persistence.*;
import lombok.*;

/** Bài nhạc nền có sẵn để chọn khi đăng video. */
@Entity
@Table(name = "audios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Audio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 100)
    private String artist;

    private String coverUrl;

    private int durationSec;

    // hiện ở tab "Trending" khi chọn nhạc
    @Builder.Default
    private boolean trending = false;
}
