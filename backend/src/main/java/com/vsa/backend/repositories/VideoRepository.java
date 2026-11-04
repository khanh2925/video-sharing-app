package com.vsa.backend.repositories;

import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

// Video. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // UC10: video của một người theo trạng thái, mới nhất trước (vd danh sách bản nháp)
    Page<Video> findByOwnerIdAndStatusOrderByCreatedAtDesc(Long ownerId, VideoStatus status, Pageable pageable);

    // Feed "Đang theo dõi": video đã đăng của những người viewerId đang theo dõi, mới nhất trước
    @Query("""
            select v from Video v
            where v.status = :status
              and v.visibility in :visibilities
              and v.owner.id in (select f.following.id from Follow f where f.follower.id = :viewerId)
            order by v.createdAt desc
            """)
    Page<Video> findFollowingFeed(@Param("viewerId") Long viewerId,
                                  @Param("status") VideoStatus status,
                                  @Param("visibilities") Collection<Visibility> visibilities,
                                  Pageable pageable);

    Page<Video> findByStatusAndVisibilityOrderByViewCountDesc(
            VideoStatus status, Visibility visibility, Pageable pageable);

    // Trending cho khách: điểm xu hướng cao trước (TrendingScoreService tính), bằng điểm thì nhiều lượt xem trước
    Page<Video> findByStatusAndVisibilityOrderByTrendingScoreDescViewCountDescIdDesc(
            VideoStatus status, Visibility visibility, Pageable pageable);

    /**
     * Trending cho người đã đăng nhập: video CHƯA xem lên trước, video đã xem xuống cuối,
     * trong mỗi nhóm xếp theo điểm xu hướng rồi tới lượt xem. "Đã xem" tính các lượt xem trước mốc :before
     * (lúc app tải trang đầu), để đang lướt mà xem thêm video thì các trang sau không bị lệch.
     */
    @Query(value = """
            select v from Video v
            where v.status = com.vsa.backend.enums.VideoStatus.PUBLISHED
              and v.visibility = com.vsa.backend.enums.Visibility.PUBLIC
            order by (select count(h) from WatchHistory h
                      where h.user.id = :userId and h.video = v and h.watchedAt < :before) asc,
                     v.trendingScore desc, v.viewCount desc, v.id desc
            """,
            countQuery = """
            select count(v) from Video v
            where v.status = com.vsa.backend.enums.VideoStatus.PUBLISHED
              and v.visibility = com.vsa.backend.enums.Visibility.PUBLIC
            """)
    Page<Video> findTrendingUnwatchedFirst(@Param("userId") Long userId,
                                           @Param("before") LocalDateTime before,
                                           Pageable pageable);

    Page<Video> findByTopicIdAndStatusAndVisibilityOrderByCreatedAtDesc(
            Long topicId, VideoStatus status, Visibility visibility, Pageable pageable);

    // Màn Âm thanh: các video đang dùng một bài nhạc, nhiều lượt xem lên trước
    Page<Video> findByAudioIdAndStatusAndVisibilityOrderByViewCountDesc(
            Long audioId, VideoStatus status, Visibility visibility, Pageable pageable);

    @Query("select distinct v from Video v left join v.hashtags h "
            + "where v.status = :status and v.visibility = :visibility and "
            + "(lower(coalesce(v.title, '')) like lower(concat('%', :query, '%')) escape '!' "
            + "or lower(coalesce(v.description, '')) like lower(concat('%', :query, '%')) escape '!' "
            + "or lower(coalesce(h.name, '')) like lower(concat('%', :query, '%')) escape '!') "
            + "order by v.viewCount desc")
    // :query phải được SearchService thoát sẵn ký tự đặc biệt (%, _, !) với ký tự thoát '!'
    // (không dùng dấu gạch ngược vì MySQL coi nó là ký tự thoát trong chuỗi, dễ sinh câu SQL sai)
    Page<Video> searchPublic(@Param("query") String query,
                             @Param("status") VideoStatus status,
                             @Param("visibility") Visibility visibility,
                             Pageable pageable);

    // ===== UC06 – Xem hồ sơ người dùng =====
    // Tổng lượt thích trên các video của một người (ô "Likes" ở hồ sơ).
    // COALESCE: người chưa có video nào thì SUM trả NULL → đổi thành 0
    @Query("""
            SELECT COALESCE(SUM(v.likeCount), 0L)
            FROM Video v
            WHERE v.owner.id = :ownerId
              AND v.status = :status
            """)
    long sumLikeCountByOwner(@Param("ownerId") Long ownerId,
                             @Param("status") VideoStatus status);

    // Tab Videos ở hồ sơ: video của 1 người theo trạng thái, chỉ lấy các chế độ hiển thị trong danh sách, mới nhất trước
    // ...VisibilityIn(...) → WHERE visibility IN (...)
    Page<Video> findByOwnerIdAndStatusAndVisibilityInOrderByCreatedAtDesc(Long ownerId,
                                                                         VideoStatus status,
                                                                         Collection<Visibility> visibilities,
                                                                         Pageable pageable);

    // ===== Bộ đếm: cộng / trừ ngay trong DB bằng 1 câu UPDATE =====
    // Không đọc lên, cộng trong Java rồi ghi lại: 2 người bấm thích cùng lúc sẽ mất 1 lượt (lost update).
    // delta âm thì không cho xuống dưới 0. Không dùng clearAutomatically để video đang mở trong
    // phiên Hibernate không bị tách ra (đọc owner, hashtags... sau đó sẽ lỗi LazyInitializationException).
    // Lưu ý: KHÔNG gọi video.setXxxCount(...) sau các hàm này, Hibernate sẽ ghi đè lại giá trị cũ.

    @Modifying(flushAutomatically = true)
    @Query("update Video v set v.likeCount = case when v.likeCount + :delta < 0 then 0 "
            + "else v.likeCount + :delta end where v.id = :videoId")
    int addLikeCount(@Param("videoId") Long videoId, @Param("delta") long delta);

    @Modifying(flushAutomatically = true)
    @Query("update Video v set v.commentCount = case when v.commentCount + :delta < 0 then 0 "
            + "else v.commentCount + :delta end where v.id = :videoId")
    int addCommentCount(@Param("videoId") Long videoId, @Param("delta") long delta);

    @Modifying(flushAutomatically = true)
    @Query("update Video v set v.viewCount = v.viewCount + 1 where v.id = :videoId")
    int incrementViewCount(@Param("videoId") Long videoId);

    // ===== Điểm xu hướng (TrendingScoreService) =====

    /** Chỉ vài cột của video công khai đã đăng, không nạp cả entity. */
    interface TrendingRow {
        Long getId();

        String getTitle();

        LocalDateTime getCreatedAt();

        Long getOwnerId();
    }

    @Query("select v.id as id, v.title as title, v.createdAt as createdAt, v.owner.id as ownerId from Video v "
            + "where v.status = com.vsa.backend.enums.VideoStatus.PUBLISHED "
            + "and v.visibility = com.vsa.backend.enums.Visibility.PUBLIC")
    List<TrendingRow> findPublicForTrending();

    // Chỉ ghi cột trending_score: không đụng tới lượt xem/thích đang được cộng song song
    @Modifying
    @Query("update Video v set v.trendingScore = :score where v.id = :videoId")
    int updateTrendingScore(@Param("videoId") Long videoId, @Param("score") double score);

    // ===== Trang quản trị (UC15) =====

    // Danh sách video cho quản trị viên: lọc theo trạng thái, tìm trong tiêu đề hoặc tên tác giả, mới nhất trước.
    // :query đã được thoát %, _, ! (SearchService.escapeLike); rỗng thì khớp mọi video.
    @Query("""
            select v from Video v join v.owner o
            where v.status in :statuses
              and (lower(coalesce(v.title, '')) like lower(concat('%', :query, '%')) escape '!'
                   or lower(o.username) like lower(concat('%', :query, '%')) escape '!'
                   or lower(coalesce(o.displayName, '')) like lower(concat('%', :query, '%')) escape '!')
            order by v.createdAt desc
            """)
    Page<Video> searchForAdmin(@Param("query") String query,
                               @Param("statuses") Collection<VideoStatus> statuses,
                               Pageable pageable);

    long countByStatus(VideoStatus status);
}
