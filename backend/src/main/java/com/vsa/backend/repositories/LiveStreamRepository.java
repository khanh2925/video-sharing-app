package com.vsa.backend.repositories;

import com.vsa.backend.entities.LiveStream;
import com.vsa.backend.enums.LiveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

// Phiên livestream. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface LiveStreamRepository extends JpaRepository<LiveStream, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc
    boolean existsByHostIdAndStatus(Long hostId, LiveStatus status);

    // Các buổi live của một người theo trạng thái (tự kết thúc buổi cũ, chủ phòng mất kết nối)
    List<LiveStream> findByHostIdAndStatus(Long hostId, LiveStatus status);

    List<LiveStream> findByStatusOrderByStartedAtDesc(LiveStatus status);
}
