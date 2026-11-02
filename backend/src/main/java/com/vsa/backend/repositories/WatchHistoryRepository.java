package com.vsa.backend.repositories;

import com.vsa.backend.entities.Video;
import com.vsa.backend.entities.WatchHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface WatchHistoryRepository extends JpaRepository<WatchHistory, Long> {

    // Thêm dòng mới, hoặc đã có (cùng người, cùng video) thì chỉ cập nhật thời điểm xem. Câu lệnh riêng của MySQL.
    @Modifying
    @Query(value = """
            insert into watch_history (user_id, video_id, watched_at) values (:userId, :videoId, now(6))
            on duplicate key update watched_at = now(6)
            """, nativeQuery = true)
    void upsert(@Param("userId") Long userId, @Param("videoId") Long videoId);

    // Video đã xem, mới xem nhất trước. Bỏ video không còn xem được: nháp, bị ẩn, riêng tư của người khác.
    @Query(value = """
            select h.video from WatchHistory h
            where h.user.id = :userId
              and h.video.status = com.vsa.backend.enums.VideoStatus.PUBLISHED
              and (h.video.visibility <> com.vsa.backend.enums.Visibility.PRIVATE or h.video.owner.id = :userId)
            order by h.watchedAt desc
            """,
            countQuery = """
            select count(h) from WatchHistory h
            where h.user.id = :userId
              and h.video.status = com.vsa.backend.enums.VideoStatus.PUBLISHED
              and (h.video.visibility <> com.vsa.backend.enums.Visibility.PRIVATE or h.video.owner.id = :userId)
            """)
    Page<Video> findWatchedVideos(@Param("userId") Long userId, Pageable pageable);

    @Modifying
    @Query("delete from WatchHistory h where h.user.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("delete from WatchHistory h where h.user.id = :userId and h.video.id in :videoIds")
    int deleteByUserIdAndVideoIds(@Param("userId") Long userId, @Param("videoIds") Collection<Long> videoIds);
}
