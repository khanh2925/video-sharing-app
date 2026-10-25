package com.vsa.backend.repositories;

import com.vsa.backend.entities.VideoLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

// Lượt thích video. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface VideoLikeRepository extends JpaRepository<VideoLike, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    boolean existsByVideoIdAndUserId(Long videoId, Long userId);

    // UC10 xoá video: xoá hết lượt thích của video bằng 1 câu DELETE
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from VideoLike vl where vl.video.id = :videoId")
    int deleteAllByVideoId(@Param("videoId") Long videoId);
}
