package com.vsa.backend.repositories;

import com.vsa.backend.entities.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Lấy kèm actor và video trong 1 câu SQL, tránh N+1 khi map ra response
    @EntityGraph(attributePaths = {"actor", "video"})
    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    long countByRecipientIdAndReadFalse(Long recipientId);

    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    @Modifying
    @Query("update Notification n set n.read = true where n.recipient.id = :recipientId and n.read = false")
    int markAllRead(@Param("recipientId") Long recipientId);

    // ===== Điểm xu hướng: lượt chia sẻ (UC20) =====

    interface ShareRow {
        Long getUserId();

        Long getVideoId();
    }

    /** Ai đã chia sẻ video nào từ mốc :since; chia sẻ một video cho nhiều bạn vẫn chỉ ra một dòng. */
    @Query("select distinct n.actor.id as userId, n.video.id as videoId from Notification n "
            + "where n.type = com.vsa.backend.enums.NotificationType.SHARE "
            + "and n.video is not null and n.createdAt >= :since")
    List<ShareRow> findSharesSince(@Param("since") LocalDateTime since);
}
