package com.vsa.backend.controllers;

import com.vsa.backend.dtos.response.AudioResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.TopicResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.services.CatalogService;
import com.vsa.backend.services.VideoService;
import com.vsa.backend.utils.PageUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/topics              danh sách chủ đề (công khai)
 * GET /api/audios              danh sách nhạc nền, trending lên đầu (công khai)
 * GET /api/audios/{id}         một bài nhạc (đầu màn Âm thanh)
 * GET /api/audios/{id}/videos  video công khai đang dùng bài nhạc đó, ?page=0&size=18
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;
    private final VideoService videoService;

    @GetMapping("/topics")
    public List<TopicResponse> getTopics() {
        return catalogService.getTopics();
    }

    @GetMapping("/audios")
    public List<AudioResponse> getAudios() {
        return catalogService.getAudios();
    }

    @GetMapping("/audios/{id}")
    public AudioResponse getAudio(@PathVariable Long id) {
        return catalogService.getAudio(id);
    }

    @GetMapping("/audios/{id}/videos")
    public PageResponse<VideoResponse> getAudioVideos(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "18") int size) {
        return videoService.getByAudio(id, PageUtils.of(page, size));
    }
}
