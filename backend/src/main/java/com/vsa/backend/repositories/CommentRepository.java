package com.vsa.backend.repositories;

import com.vsa.backend.entities.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

// Bình luận. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    Page<Comment> findByVideoIdOrderByCreatedAtDesc(Long videoId, Pageable pageable);

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // UC10 xoá video: xoá hết bình luận của video (phải xoá lượt thích bình luận trước)
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Comment c where c.video.id = :videoId")
    int deleteAllByVideoId(@Param("videoId") Long videoId);

    // Cộng / trừ lượt thích bình luận ngay trong DB (tránh mất lượt khi bấm cùng lúc), không xuống dưới 0
    @Modifying(flushAutomatically = true)
    @Query("update Comment c set c.likeCount = case when c.likeCount + :delta < 0 then 0 "
            + "else c.likeCount + :delta end where c.id = :commentId")
    int addLikeCount(@Param("commentId") Long commentId, @Param("delta") long delta);
}
