package com.vsa.backend.repositories;

import com.vsa.backend.entities.LiveStream;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// Phiên livestream. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface LiveStreamRepository extends JpaRepository<LiveStream, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc
}
