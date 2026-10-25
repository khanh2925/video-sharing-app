package com.vsa.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Quan hệ theo dõi: follower theo dõi following. Mỗi cặp chỉ có một dòng. */
@Entity
@Table(name = "follows",
        uniqueConstraints = @UniqueConstraint(columnNames = {"follower_id", "following_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Follow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // người theo dõi
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "follower_id")
    private User follower;

    // người được theo dõi
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "following_id")
    private User following;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
