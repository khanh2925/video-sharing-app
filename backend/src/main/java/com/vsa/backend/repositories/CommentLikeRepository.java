package com.vsa.backend.repositories;

import com.vsa.backend.entities.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

// Lượt thích bình luận. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // UC10 xoá video: xoá lượt thích của mọi bình luận thuộc video
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from CommentLike cl where cl.comment.id in "
            + "(select c.id from Comment c where c.video.id = :videoId)")
    int deleteAllOnCommentsOfVideo(@Param("videoId") Long videoId);
}
