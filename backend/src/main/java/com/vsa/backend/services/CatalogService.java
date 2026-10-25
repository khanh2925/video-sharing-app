package com.vsa.backend.services;

import com.vsa.backend.dtos.response.AudioResponse;
import com.vsa.backend.dtos.response.TopicResponse;
import com.vsa.backend.mappers.CatalogMapper;
import com.vsa.backend.repositories.AudioRepository;
import com.vsa.backend.repositories.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Danh mục dùng để chọn: chủ đề (UC08 chọn chủ đề, UC04 Browse topic) và nhạc nền (UC09).
 * Danh sách ngắn nên trả hết, không phân trang. Lọc nhạc theo tên làm ở app.
 */
@Service
@RequiredArgsConstructor
public class CatalogService {

    private final TopicRepository topicRepository;
    private final AudioRepository audioRepository;
    private final CatalogMapper catalogMapper;

    @Transactional(readOnly = true)
    public List<TopicResponse> getTopics() {
        return topicRepository.findAllByOrderByNameAsc().stream()
                .map(catalogMapper::toTopicResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AudioResponse> getAudios() {
        return audioRepository.findAllByOrderByTrendingDescTitleAsc().stream()
                .map(catalogMapper::toAudioResponse)
                .toList();
    }
}
