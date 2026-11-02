package com.vsa.backend.ai.tracking;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserEventRepository extends JpaRepository<UserEvent, Long> {

    /** Sự kiện mới nhất của một người (để tính sở thích). */
    List<UserEvent> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
