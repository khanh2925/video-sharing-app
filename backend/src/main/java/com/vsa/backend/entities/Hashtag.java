package com.vsa.backend.entities;

import com.vsa.backend.utils.AppConstants;
import jakarta.persistence.*;
import lombok.*;

/** Hashtag gắn vào video, lưu không có dấu #, viết thường. */
@Entity
@Table(name = "hashtags")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hashtag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = AppConstants.HASHTAG_MAX)
    private String name;
}
