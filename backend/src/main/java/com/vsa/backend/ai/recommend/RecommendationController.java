package com.vsa.backend.ai.recommend;

import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.Video;
import com.vsa.backend.repositories.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * API phần gợi ý — Khánh.
 *  GET  /api/search/semantic?q=...   tìm theo nghĩa (khách cũng dùng được)
 *  GET  /api/videos/me/for-you       "Dành cho bạn" (cần đăng nhập)
 *  POST /api/admin/ai/reindex        nạp lại vector cho mọi video (quản trị viên)
 */
@RestController
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final VideoEmbeddingService videoEmbeddingService;
    private final VideoRepository videoRepository;

    @GetMapping("/api/search/semantic")
    public List<VideoResponse> semanticSearch(@RequestParam String q) {
        return recommendationService.semanticSearch(q);
    }

    @GetMapping("/api/videos/me/for-you")
    public List<VideoResponse> forYou() {
        return recommendationService.forYou();
    }

    @PostMapping("/api/admin/ai/reindex")
    @Transactional(readOnly = true)
    public Map<String, Integer> reindex() {
        List<Video> videos = videoRepository.findAll();
        videos.forEach(videoEmbeddingService::index);
        return Map.of("videos", videos.size());
    }
}
