package com.vsa.backend.repositories;

import com.vsa.backend.entities.VideoLike;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

// Lượt thích video. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface VideoLikeRepository extends JpaRepository<VideoLike, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    boolean existsByVideoIdAndUserId(Long videoId, Long userId);

    Optional<VideoLike> findByVideoIdAndUserId(Long videoId, Long userId);

    // UC10 xoá video: xoá hết lượt thích của video bằng 1 câu DELETE
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from VideoLike vl where vl.video.id = :videoId")
    int deleteAllByVideoId(@Param("videoId") Long videoId);

    // ===== UC06 – Xem hồ sơ người dùng =====

    // Tab Liked: video mà userId đã thích, CHỈ lấy video viewerId được phép xem (bảng 6.2), mới thích trước.
    //  ① đã đăng (không lấy nháp, video bị ẩn)
    //  ② công khai, HOẶC của chính người xem, HOẶC "người theo dõi" mà người xem đang theo dõi tác giả
    //  Khách: viewerId = null → so sánh với null luôn sai → chỉ còn video công khai
    @Query("""
            SELECT vl FROM VideoLike vl
            JOIN vl.video v
            WHERE vl.user.id = :userId
              AND v.status = :published
              AND (v.visibility = :publicVisibility
                   OR v.owner.id = :viewerId
                   OR (v.visibility = :followersVisibility
                       AND EXISTS (SELECT f.id FROM Follow f
                                   WHERE f.follower.id = :viewerId
                                     AND f.following.id = v.owner.id)))
            ORDER BY vl.createdAt DESC
            """)
    Page<VideoLike> findVisibleLikes(@Param("userId") Long userId,
                                     @Param("viewerId") Long viewerId,
                                     @Param("published") VideoStatus published,
                                     @Param("publicVisibility") Visibility publicVisibility,
                                     @Param("followersVisibility") Visibility followersVisibility,
                                     Pageable pageable);

    // Trong danh sách videoIds, video nào userId đã thích → để tô đỏ trái tim trên lưới video
    // (1 câu truy vấn cho cả trang, không hỏi DB từng video)
    @Query("""
            SELECT vl.video.id FROM VideoLike vl
            WHERE vl.user.id = :userId
              AND vl.video.id IN :videoIds
            """)
    Set<Long> findLikedVideoIds(@Param("userId") Long userId,
                                @Param("videoIds") Collection<Long> videoIds);
}
