package com.vsa.backend.controllers;

import com.vsa.backend.ai.tracking.EventType;
import com.vsa.backend.ai.tracking.TrackingService;
import com.vsa.backend.dtos.request.CommentCreateRequest;
import com.vsa.backend.dtos.response.CommentResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.services.InteractionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class InteractionController {

    private final InteractionService interactionService;
    private final TrackingService trackingService;   // ghi hành vi cho gợi ý video (AI)

    @PostMapping("/api/videos/{videoId}/like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void likeVideo(@PathVariable Long videoId) {
        interactionService.likeVideo(videoId);
        trackingService.videoEvent(EventType.LIKE, videoId);
    }

    @DeleteMapping("/api/videos/{videoId}/like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlikeVideo(@PathVariable Long videoId) {
        interactionService.unlikeVideo(videoId);
        trackingService.videoEvent(EventType.UNLIKE, videoId);
    }

    @GetMapping("/api/videos/{videoId}/comments")
    public PageResponse<CommentResponse> getComments(@PathVariable Long videoId,
                                                      @RequestParam(defaultValue = "0") int page) {
        return interactionService.getComments(videoId, Math.max(page, 0));   // page âm → trang đầu
    }

    @PostMapping("/api/videos/{videoId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse createComment(@PathVariable Long videoId,
                                         @Valid @RequestBody CommentCreateRequest request) {
        CommentResponse comment = interactionService.createComment(videoId, request);
        trackingService.videoEvent(EventType.COMMENT, videoId);
        return comment;
    }

    @DeleteMapping("/api/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long commentId) {
        interactionService.deleteComment(commentId);
    }

    @PostMapping("/api/comments/{commentId}/like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void likeComment(@PathVariable Long commentId) {
        interactionService.likeComment(commentId);
    }

    @DeleteMapping("/api/comments/{commentId}/like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlikeComment(@PathVariable Long commentId) {
        interactionService.unlikeComment(commentId);
    }
}
