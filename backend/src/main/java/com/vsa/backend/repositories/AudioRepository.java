package com.vsa.backend.repositories;

import com.vsa.backend.entities.Audio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// Bài nhạc. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface AudioRepository extends JpaRepository<Audio, Long> {

    // Thêm hàm truy vấn khi cần, đặt tên theo quy tắc Spring Data:
    // findBy<TenThuocTinh>, existsBy..., countBy..., ...OrderBy<TenThuocTinh>Desc

    // UC09: nhạc trending lên đầu, còn lại theo tên
    List<Audio> findAllByOrderByTrendingDescTitleAsc();

    Page<Audio> findByTitleContainingIgnoreCaseOrArtistContainingIgnoreCase(
            String title, String artist, Pageable pageable);
}
