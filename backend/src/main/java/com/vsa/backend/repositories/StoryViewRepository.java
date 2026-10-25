package com.vsa.backend.repositories;

import com.vsa.backend.entities.StoryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

// Lượt xem story. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface StoryViewRepository extends JpaRepository<StoryView, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    boolean existsByStoryIdAndViewerId(Long storyId, Long viewerId);

    // UC18: trong các story cho trước, story nào người này đã xem
    @Query("select sv.story.id from StoryView sv where sv.viewer.id = :viewerId and sv.story.id in :storyIds")
    List<Long> findViewedStoryIds(@Param("viewerId") Long viewerId, @Param("storyIds") Collection<Long> storyIds);
}
