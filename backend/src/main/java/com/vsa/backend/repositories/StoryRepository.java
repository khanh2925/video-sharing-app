package com.vsa.backend.repositories;

import com.vsa.backend.entities.Story;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

// Story. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface StoryRepository extends JpaRepository<Story, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // UC18: story còn hạn của một nhóm người, cũ trước mới sau. EntityGraph tải luôn owner trong 1 câu SQL
    @EntityGraph(attributePaths = "owner")
    List<Story> findByOwnerIdInAndExpiresAtAfterOrderByCreatedAtAsc(Collection<Long> ownerIds, LocalDateTime now);
}
