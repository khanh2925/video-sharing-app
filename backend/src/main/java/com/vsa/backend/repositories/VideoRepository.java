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

// Video. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface VideoRepository extends JpaRepository<Video, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // UC10: video của một người theo trạng thái, mới nhất trước (vd danh sách bản nháp)
    Page<Video> findByOwnerIdAndStatusOrderByCreatedAtDesc(Long ownerId, VideoStatus status, Pageable pageable);

    Page<Video> findByStatusAndVisibilityOrderByViewCountDesc(
            VideoStatus status, Visibility visibility, Pageable pageable);

    Page<Video> findByTopicIdAndStatusAndVisibilityOrderByCreatedAtDesc(
            Long topicId, VideoStatus status, Visibility visibility, Pageable pageable);

    @Query("select distinct v from Video v left join v.hashtags h "
            + "where v.status = :status and v.visibility = :visibility and "
            + "(lower(coalesce(v.title, '')) like lower(concat('%', :query, '%')) "
            + "or lower(coalesce(v.description, '')) like lower(concat('%', :query, '%')) "
            + "or lower(coalesce(h.name, '')) like lower(concat('%', :query, '%'))) "
            + "order by v.viewCount desc")
    Page<Video> searchPublic(@Param("query") String query,
                             @Param("status") VideoStatus status,
                             @Param("visibility") Visibility visibility,
                             Pageable pageable);
}
