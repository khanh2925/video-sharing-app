package com.vsa.backend.services;

import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.Video;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.VideoLikeRepository;
import com.vsa.backend.repositories.WatchHistoryRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Lịch sử xem (màn Lịch sử xem, tab "Lịch sử" ở Hồ sơ của tôi).
 * Ghi lại mỗi lần người đã đăng nhập mở một video (cùng lúc với tăng lượt xem); khách thì không ghi.
 */
@Service
@RequiredArgsConstructor
public class WatchHistoryService {

    private final WatchHistoryRepository watchHistoryRepository;
    private final VideoLikeRepository videoLikeRepository;
    private final VideoMapper videoMapper;

    /** Gọi sau khi đã kiểm tra quyền xem video (VideoService.recordView). */
    @Transactional
    public void record(Long videoId) {
        Long me = SecurityUtils.getCurrentUserIdOrNull();
        if (me != null) {
            watchHistoryRepository.upsert(me, videoId);
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<VideoResponse> getMine(Pageable pageable) {
        Long me = SecurityUtils.getCurrentUserId();
        Page<Video> videos = watchHistoryRepository.findWatchedVideos(me, pageable);
        Set<Long> liked = videos.isEmpty() ? Set.of()
                : videoLikeRepository.findLikedVideoIds(me, videos.getContent().stream().map(Video::getId).toList());
        return PageResponse.of(videos, v -> videoMapper.toResponse(v, liked.contains(v.getId())));
    }

    @Transactional
    public void clearMine() {
        watchHistoryRepository.deleteByUserId(SecurityUtils.getCurrentUserId());
    }
}
