package com.vsa.backend.entities;

import jakarta.persistence.*;
import lombok.*;

/** Chủ đề video (Thể thao, Âm nhạc...). Dùng cho bộ lọc ở màn hình tìm kiếm. */
@Entity
@Table(name = "topics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Topic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    private String icon;

    // mã màu hex, ví dụ #F44B87
    @Column(length = 10)
    private String color;
}
