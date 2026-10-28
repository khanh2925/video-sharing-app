package com.vsa.backend.repositories;

import com.vsa.backend.entities.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

// Quan hệ theo dõi. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // id những người mà followerId đang theo dõi (UC18 dùng để lấy story)
    @Query("select f.following.id from Follow f where f.follower.id = :followerId")
    List<Long> findFollowingIds(@Param("followerId") Long followerId);
}
