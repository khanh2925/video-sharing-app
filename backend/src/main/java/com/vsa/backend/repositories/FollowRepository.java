package com.vsa.backend.repositories;

import com.vsa.backend.entities.Follow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

// Quan hệ theo dõi. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // id những người mà followerId đang theo dõi (UC18 dùng để lấy story)
    @Query("select f.following.id from Follow f where f.follower.id = :followerId")
    List<Long> findFollowingIds(@Param("followerId") Long followerId);

    // ===== UC06 – Xem hồ sơ người dùng =====
    // Viết đúng TÊN HÀM là Spring tự sinh câu SQL, không cần @Query
    long countByFollowerId(Long followerId);                                  // số người mà followerId đang theo dõi (Following)

    long countByFollowingId(Long followingId);                                // số người đang theo dõi followingId (Followers)

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);   // followerId có đang theo dõi followingId không

    // ===== UC12 – Theo dõi người dùng =====

    Optional<Follow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);   // để bỏ theo dõi

    Page<Follow> findByFollowingIdOrderByCreatedAtDesc(Long followingId, Pageable pageable);  // ai đang theo dõi followingId (tab followers)

    Page<Follow> findByFollowerIdOrderByCreatedAtDesc(Long followerId, Pageable pageable);    // followerId đang theo dõi ai (tab following)

    // Trong danh sách userIds, những ai followerId đang theo dõi → tô nút "Following" cho cả trang bằng 1 câu truy vấn
    @Query("""
            SELECT f.following.id FROM Follow f
            WHERE f.follower.id = :followerId
              AND f.following.id IN :userIds
            """)
    Set<Long> findFollowingIdsIn(@Param("followerId") Long followerId,
                                 @Param("userIds") Collection<Long> userIds);
}
