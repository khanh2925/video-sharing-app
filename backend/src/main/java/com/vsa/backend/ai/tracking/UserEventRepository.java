package com.vsa.backend.ai.tracking;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserEventRepository extends JpaRepository<UserEvent, Long> {

    /** Sự kiện mới nhất của một người (để tính sở thích). */
    List<UserEvent> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // Trang quản trị xem nhật ký hành vi, mới nhất trước, lọc theo người và / hoặc loại
    Page<UserEvent> findAllByOrderByIdDesc(Pageable pageable);

    Page<UserEvent> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    Page<UserEvent> findByEventTypeOrderByIdDesc(EventType eventType, Pageable pageable);

    Page<UserEvent> findByUserIdAndEventTypeOrderByIdDesc(Long userId, EventType eventType, Pageable pageable);
}
