package com.vsa.backend.services;

import com.vsa.backend.configurations.AppProperties;
import com.vsa.backend.dtos.request.CommentCreateRequest;
import com.vsa.backend.dtos.response.CommentResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.entities.Comment;
import com.vsa.backend.entities.CommentLike;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.entities.VideoLike;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.CommentLikeRepository;
import com.vsa.backend.repositories.CommentRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoLikeRepository;
import com.vsa.backend.repositories.VideoRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InteractionService {

    private final VideoRepository videoRepository;
    private final VideoLikeRepository videoLikeRepository;
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final AppProperties appProperties;

    @Transactional
    public void likeVideo(Long videoId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Video video = findPublishedVideo(videoId);
        if (videoLikeRepository.existsByVideoIdAndUserId(videoId, userId)) {
            throw ApiException.conflict("Bạn đã thích video này");
        }
        User user = userRepository.getReferenceById(userId);
        videoLikeRepository.save(VideoLike.builder().video(video).user(user).build());
        video.setLikeCount(video.getLikeCount() + 1);
    }

    @Transactional
    public void unlikeVideo(Long videoId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Video video = findPublishedVideo(videoId);
        VideoLike like = videoLikeRepository.findByVideoIdAndUserId(videoId, userId)
                .orElseThrow(() -> ApiException.notFound("Bạn chưa thích video này"));
        videoLikeRepository.delete(like);
        video.setLikeCount(Math.max(0, video.getLikeCount() - 1));
    }

    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> getComments(Long videoId, int page) {
        findPublishedVideo(videoId);
        Long userId = SecurityUtils.getCurrentUserIdOrNull();
        int size = appProperties.paging().commentPageSize();
        return PageResponse.of(
                commentRepository.findByVideoIdOrderByCreatedAtDesc(videoId, PageRequest.of(page, size)),
                comment -> toResponse(comment, userId));
    }

    @Transactional
    public CommentResponse createComment(Long videoId, CommentCreateRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        Video video = findPublishedVideo(videoId);
        if (!video.isAllowComments()) {
            throw ApiException.conflict("Video đã tắt bình luận");
        }
        Comment comment = commentRepository.save(Comment.builder()
                .content(request.content().trim())
                .user(userRepository.getReferenceById(userId))
                .video(video)
                .build());
        video.setCommentCount(video.getCommentCount() + 1);
        return toResponse(comment, userId);
    }

    @Transactional
    public void deleteComment(Long commentId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Comment comment = findComment(commentId);
        if (!comment.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("Bạn không có quyền xoá bình luận này");
        }
        Video video = comment.getVideo();
        commentLikeRepository.deleteAllByCommentId(commentId);
        commentRepository.delete(comment);
        video.setCommentCount(Math.max(0, video.getCommentCount() - 1));
    }

    @Transactional
    public void likeComment(Long commentId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Comment comment = findComment(commentId);
        if (commentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) {
            throw ApiException.conflict("Bạn đã thích bình luận này");
        }
        commentLikeRepository.save(CommentLike.builder()
                .comment(comment)
                .user(userRepository.getReferenceById(userId))
                .build());
        comment.setLikeCount(comment.getLikeCount() + 1);
    }

    @Transactional
    public void unlikeComment(Long commentId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Comment comment = findComment(commentId);
        CommentLike like = commentLikeRepository.findByCommentIdAndUserId(commentId, userId)
                .orElseThrow(() -> ApiException.notFound("Bạn chưa thích bình luận này"));
        commentLikeRepository.delete(like);
        comment.setLikeCount(Math.max(0, comment.getLikeCount() - 1));
    }

    private Video findPublishedVideo(Long videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy video"));
        if (video.getStatus() != VideoStatus.PUBLISHED) {
            throw ApiException.notFound("Không tìm thấy video");
        }
        return video;
    }

    private Comment findComment(Long commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bình luận"));
    }

    private CommentResponse toResponse(Comment comment, Long userId) {
        boolean liked = userId != null
                && commentLikeRepository.existsByCommentIdAndUserId(comment.getId(), userId);
        return new CommentResponse(comment.getId(), comment.getContent(), comment.getLikeCount(), liked,
                comment.getCreatedAt(), userMapper.toSummary(comment.getUser()));
    }
}
