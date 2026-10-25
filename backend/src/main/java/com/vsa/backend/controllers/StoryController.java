package com.vsa.backend.controllers;

import com.vsa.backend.dtos.response.StoryGroupResponse;
import com.vsa.backend.dtos.response.StoryResponse;
import com.vsa.backend.services.StoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * API story (đều cần token):
 *  POST   /api/stories             multipart: file, durationSec (bắt buộc nếu là video) → 201
 *  DELETE /api/stories/{id}        xoá story của mình → 204
 *  GET    /api/stories/feed        hàng Stories: nhóm theo người đăng
 *  POST   /api/stories/{id}/view   đánh dấu đã xem → 204
 */
@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public StoryResponse create(@RequestPart("file") MultipartFile file,
                                @RequestParam(required = false) Integer durationSec) {
        return storyService.create(file, durationSec);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        storyService.delete(id);
    }

    @GetMapping("/feed")
    public List<StoryGroupResponse> getFeed() {
        return storyService.getFeed();
    }

    @PostMapping("/{id}/view")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markViewed(@PathVariable Long id) {
        storyService.markViewed(id);
    }
}
