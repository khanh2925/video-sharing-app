package com.vsa.backend.controllers;

import com.vsa.backend.ai.tracking.EventType;
import com.vsa.backend.ai.tracking.TrackingService;
import com.vsa.backend.dtos.request.CreateVideoRequest;
import com.vsa.backend.dtos.request.UpdateVideoRequest;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.services.VideoService;
import com.vsa.backend.services.WatchHistoryService;
import com.vsa.backend.utils.PageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * API video phía người đăng (đều cần token):
 *  POST   /api/videos             multipart: file, thumbnail + các trường của CreateVideoRequest → 201
 *  GET    /api/videos/me/drafts   bản nháp của tôi, ?page=0&size=20
 *  PUT    /api/videos/{id}        sửa / đăng bản nháp (JSON UpdateVideoRequest)
 *  DELETE /api/videos/{id}        xoá → 204
 * Thanh thêm các API xem video (GET /api/videos/{id}, /trending...) vào cùng controller này.
 */
@RestController
@RequestMapping("/api/videos")
@RequiredArgsConstructor
public class VideoController {

    private final VideoService videoService;
    private final WatchHistoryService watchHistoryService;
    private final TrackingService trackingService;   // ghi hành vi cho gợi ý video (AI)

    // GET /api/videos/trending?page=0&size=10&before=1793625000000
    // before (mili giây, không bắt buộc): mốc app tải trang đầu, giữ thứ tự ổn định khi tải các trang sau
    @GetMapping("/trending")
    public PageResponse<VideoResponse> getTrending(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long before) {
        LocalDateTime cutoff = before == null ? null
                : LocalDateTime.ofInstant(Instant.ofEpochMilli(before), ZoneId.systemDefault());
        return videoService.getTrending(PageUtils.of(page, size), cutoff);
    }

    // GET /api/videos/following?page=0&size=10 → feed "Đang theo dõi" (cần đăng nhập)
    @GetMapping("/following")
    public PageResponse<VideoResponse> getFollowingFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return videoService.getFollowingFeed(PageUtils.of(page, size));
    }

    @GetMapping
    public PageResponse<VideoResponse> getByTopic(
            @RequestParam Long topicId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return videoService.getByTopic(topicId,
                PageUtils.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/{id}")
    public VideoResponse getById(@PathVariable Long id) {
        return videoService.getById(id);
    }

    @PostMapping("/{id}/view")
    public VideoResponse recordView(@PathVariable Long id) {
        VideoResponse video = videoService.recordView(id);   // kiểm tra quyền xem + tăng lượt xem
        watchHistoryService.record(id);                      // đã đăng nhập thì ghi vào lịch sử xem
        trackingService.videoEvent(EventType.VIEW, id);      // nhật ký hành vi cho AI (cả khách)
        return video;
    }

    // @ModelAttribute: gom các trường form-data (title, hashtags...) vào record CreateVideoRequest
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public VideoResponse create(@RequestPart("file") MultipartFile file,
                                @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
                                @Valid @ModelAttribute CreateVideoRequest request) {
        return videoService.create(file, thumbnail, request);
    }

    @GetMapping("/me/drafts")
    public PageResponse<VideoResponse> getMyDrafts(Pageable pageable) {
        return videoService.getMyDrafts(PageUtils.clamp(pageable));
    }

    // Lịch sử xem của tôi, mới xem nhất trước: GET /api/videos/me/history?page=0&size=18
    @GetMapping("/me/history")
    public PageResponse<VideoResponse> getMyHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "18") int size) {
        return watchHistoryService.getMine(PageUtils.of(page, size));
    }

    // Xoá lịch sử xem: DELETE /api/videos/me/history (xoá hết)
    // hoặc DELETE /api/videos/me/history?videoIds=1,2,3 (chỉ xoá các video đã chọn)
    @DeleteMapping("/me/history")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearMyHistory(@RequestParam(required = false) List<Long> videoIds) {
        if (videoIds == null || videoIds.isEmpty()) watchHistoryService.clearMine();
        else watchHistoryService.removeMine(videoIds);
    }

    @PutMapping("/{id}")
    public VideoResponse update(@PathVariable Long id, @Valid @RequestBody UpdateVideoRequest request) {
        return videoService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        videoService.delete(id);
    }
}
