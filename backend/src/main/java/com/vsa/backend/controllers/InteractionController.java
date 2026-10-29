package com.vsa.backend.controllers;

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

    @PostMapping("/api/videos/{videoId}/like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void likeVideo(@PathVariable Long videoId) {
        interactionService.likeVideo(videoId);
    }

    @DeleteMapping("/api/videos/{videoId}/like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlikeVideo(@PathVariable Long videoId) {
        interactionService.unlikeVideo(videoId);
    }

    @GetMapping("/api/videos/{videoId}/comments")
    public PageResponse<CommentResponse> getComments(@PathVariable Long videoId,
                                                      @RequestParam(defaultValue = "0") int page) {
        return interactionService.getComments(videoId, page);
    }

    @PostMapping("/api/videos/{videoId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse createComment(@PathVariable Long videoId,
                                         @Valid @RequestBody CommentCreateRequest request) {
        return interactionService.createComment(videoId, request);
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
