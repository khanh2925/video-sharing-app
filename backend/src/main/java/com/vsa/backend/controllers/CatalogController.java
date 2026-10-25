package com.vsa.backend.controllers;

import com.vsa.backend.dtos.response.AudioResponse;
import com.vsa.backend.dtos.response.TopicResponse;
import com.vsa.backend.services.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/topics  danh sách chủ đề (công khai)
 * GET /api/audios  danh sách nhạc nền, trending lên đầu (công khai)
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping("/topics")
    public List<TopicResponse> getTopics() {
        return catalogService.getTopics();
    }

    @GetMapping("/audios")
    public List<AudioResponse> getAudios() {
        return catalogService.getAudios();
    }
}
