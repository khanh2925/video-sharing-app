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

    // ===== UC12 – Gợi ý cho bạn =====
    // Nhóm 1 "bạn của bạn": người được những người mình đang theo dõi theo dõi.
    // Mỗi dòng [userId, số bạn chung]; nhiều bạn chung xếp trước. Đã loại: chính mình, người mình đã theo dõi,
    // người mình đã bấm X, quản trị viên, tài khoản bị khoá.
    @Query("""
            select f.following.id, count(f) from Follow f
            where f.follower.id in (select f1.following.id from Follow f1 where f1.follower.id = :viewerId)
              and f.following.id <> :viewerId
              and f.following.role = com.vsa.backend.enums.Role.USER
              and f.following.locked = false
              and f.following.id not in (select f2.following.id from Follow f2 where f2.follower.id = :viewerId)
              and f.following.id not in (select d.dismissedUser.id from SuggestionDismissal d where d.user.id = :viewerId)
            group by f.following.id
            order by count(f) desc, f.following.id asc
            """)
    List<Object[]> findFriendsOfFollowing(@Param("viewerId") Long viewerId, Pageable pageable);

    // Nhóm 2 "theo dõi lại": người đang theo dõi mình mà mình chưa theo dõi lại (cùng các điều kiện loại như trên)
    @Query("""
            select f.follower.id from Follow f
            where f.following.id = :viewerId
              and f.follower.role = com.vsa.backend.enums.Role.USER
              and f.follower.locked = false
              and f.follower.id not in (select f2.following.id from Follow f2 where f2.follower.id = :viewerId)
              and f.follower.id not in (select d.dismissedUser.id from SuggestionDismissal d where d.user.id = :viewerId)
            order by f.createdAt desc
            """)
    List<Long> findFollowersNotFollowedBack(@Param("viewerId") Long viewerId, Pageable pageable);

    // Số người theo dõi của từng người trong userIds → mỗi dòng [userId, count]
    @Query("select f.following.id, count(f) from Follow f where f.following.id in :userIds group by f.following.id")
    List<Object[]> countFollowersAmong(@Param("userIds") Collection<Long> userIds);
}
