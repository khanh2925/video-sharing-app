package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.CreateVideoRequest;
import com.vsa.backend.dtos.request.UpdateVideoRequest;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.services.VideoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
        return videoService.getMyDrafts(pageable);
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
