package com.vsa.backend.repositories;

import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.VideoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// Video. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // UC10: video của một người theo trạng thái, mới nhất trước (vd danh sách bản nháp)
    Page<Video> findByOwnerIdAndStatusOrderByCreatedAtDesc(Long ownerId, VideoStatus status, Pageable pageable);
}
