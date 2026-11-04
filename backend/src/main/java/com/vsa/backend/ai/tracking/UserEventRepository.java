package com.vsa.backend.ai.tracking;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface UserEventRepository extends JpaRepository<UserEvent, Long> {

    /** Sự kiện mới nhất của một người (để tính sở thích). */
    List<UserEvent> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // Trang quản trị xem nhật ký hành vi, mới nhất trước, lọc theo người và / hoặc loại
    Page<UserEvent> findAllByOrderByIdDesc(Pageable pageable);

    Page<UserEvent> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    Page<UserEvent> findByEventTypeOrderByIdDesc(EventType eventType, Pageable pageable);

    Page<UserEvent> findByUserIdAndEventTypeOrderByIdDesc(Long userId, EventType eventType, Pageable pageable);

    /** Điểm xu hướng: mọi hành vi gắn với video từ mốc :since tới giờ (bỏ SEARCH). */
    @Query("select e from UserEvent e where e.createdAt >= :since and e.videoId is not null "
            + "and e.eventType <> com.vsa.backend.ai.tracking.EventType.SEARCH")
    List<UserEvent> findVideoEventsSince(@Param("since") LocalDateTime since);
}
