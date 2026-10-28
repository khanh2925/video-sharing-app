package com.vsa.backend.repositories;

import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;

// Video. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // UC10: video của một người theo trạng thái, mới nhất trước (vd danh sách bản nháp)
    Page<Video> findByOwnerIdAndStatusOrderByCreatedAtDesc(Long ownerId, VideoStatus status, Pageable pageable);

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
}
