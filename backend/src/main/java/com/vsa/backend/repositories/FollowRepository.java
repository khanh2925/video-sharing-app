package com.vsa.backend.repositories;

import com.vsa.backend.entities.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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

    // ===== UC12 – Theo dõi =====
    Optional<Follow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);

    // Tab "Người theo dõi" của userId: những dòng có following = userId, mới theo dõi trước
    Page<Follow> findByFollowingIdOrderByCreatedAtDesc(Long followingId, Pageable pageable);

    // Tab "Đang theo dõi" của userId: những dòng có follower = userId
    Page<Follow> findByFollowerIdOrderByCreatedAtDesc(Long followerId, Pageable pageable);

    // Trong userIds, người nào viewerId đang theo dõi (1 câu cho cả trang, không hỏi DB từng người)
    @Query("select f.following.id from Follow f where f.follower.id = :viewerId and f.following.id in :userIds")
    Set<Long> findFollowingIdsAmong(@Param("viewerId") Long viewerId, @Param("userIds") Collection<Long> userIds);

    // Trong userIds, người nào đang theo dõi viewerId
    @Query("select f.follower.id from Follow f where f.following.id = :viewerId and f.follower.id in :userIds")
    Set<Long> findFollowerIdsAmong(@Param("viewerId") Long viewerId, @Param("userIds") Collection<Long> userIds);

    // Số người theo dõi của từng người trong userIds → mỗi dòng [userId, count]
    @Query("select f.following.id, count(f) from Follow f where f.following.id in :userIds group by f.following.id")
    List<Object[]> countFollowersAmong(@Param("userIds") Collection<Long> userIds);
}
