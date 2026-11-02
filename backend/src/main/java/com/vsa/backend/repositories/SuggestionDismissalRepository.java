package com.vsa.backend.repositories;

import com.vsa.backend.entities.SuggestionDismissal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// UC12: những người user đã bấm X ở mục "Gợi ý cho bạn"
@Repository
public interface SuggestionDismissalRepository extends JpaRepository<SuggestionDismissal, Long> {

    boolean existsByUserIdAndDismissedUserId(Long userId, Long dismissedUserId);
}
