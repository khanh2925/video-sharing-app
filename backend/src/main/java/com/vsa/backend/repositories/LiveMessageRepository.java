package com.vsa.backend.repositories;

import com.vsa.backend.entities.LiveMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// Tin nhắn trong live. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface LiveMessageRepository extends JpaRepository<LiveMessage, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc
}
