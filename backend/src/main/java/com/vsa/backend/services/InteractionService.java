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

/**
 * UC11 tương tác: thích video, bình luận, thích bình luận.
 * Mọi thao tác đều kiểm tra quyền xem video theo bảng 6.2 (VideoAccessPolicy):
 * không xem được video thì cũng không đọc / viết bình luận, không thích được.
 * Bộ đếm (likeCount, commentCount) cộng trừ thẳng trong DB bằng câu UPDATE, không set trên entity.
 */
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
    private final VideoAccessPolicy videoAccessPolicy;

    @Transactional
    public void likeVideo(Long videoId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Video video = findInteractableVideo(videoId, userId);
        if (videoLikeRepository.existsByVideoIdAndUserId(videoId, userId)) {
            throw ApiException.conflict("Bạn đã thích video này");
        }
        User user = userRepository.getReferenceById(userId);
        videoLikeRepository.save(VideoLike.builder().video(video).user(user).build());
        videoRepository.addLikeCount(videoId, 1);
    }

    @Transactional
    public void unlikeVideo(Long videoId) {
        Long userId = SecurityUtils.getCurrentUserId();
        findInteractableVideo(videoId, userId);
        VideoLike like = videoLikeRepository.findByVideoIdAndUserId(videoId, userId)
                .orElseThrow(() -> ApiException.notFound("Bạn chưa thích video này"));
        videoLikeRepository.delete(like);
        videoRepository.addLikeCount(videoId, -1);
    }

    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> getComments(Long videoId, int page) {
        Long userId = SecurityUtils.getCurrentUserIdOrNull();
        findInteractableVideo(videoId, userId);
        int size = appProperties.paging().commentPageSize();
        return PageResponse.of(
                commentRepository.findByVideoIdOrderByCreatedAtDesc(videoId, PageRequest.of(page, size)),
                comment -> toResponse(comment, userId));
    }

    @Transactional
    public CommentResponse createComment(Long videoId, CommentCreateRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        Video video = findInteractableVideo(videoId, userId);
        if (!video.isAllowComments()) {
            throw ApiException.conflict("Video đã tắt bình luận");
        }
        Comment comment = commentRepository.save(Comment.builder()
                .content(request.content().trim())
                .user(userRepository.getReferenceById(userId))
                .video(video)
                .build());
        videoRepository.addCommentCount(videoId, 1);
        return toResponse(comment, userId);
    }

    @Transactional
    public void deleteComment(Long commentId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Comment comment = findComment(commentId);
        if (!comment.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("Bạn không có quyền xoá bình luận này");
        }
        // Giảm số bình luận TRƯỚC: câu xoá lượt thích bên dưới có clearAutomatically = true,
        // chạy xong thì comment, video bị tách khỏi phiên Hibernate, đọc tiếp sẽ lỗi LazyInitializationException.
        // getVideo().getId() chỉ lấy id từ proxy, không phải tải video.
        videoRepository.addCommentCount(comment.getVideo().getId(), -1);
        commentLikeRepository.deleteAllByCommentId(commentId);
        commentRepository.delete(comment);
    }

    @Transactional
    public void likeComment(Long commentId) {
        Long userId = SecurityUtils.getCurrentUserId();
        Comment comment = findInteractableComment(commentId, userId);
        if (commentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) {
            throw ApiException.conflict("Bạn đã thích bình luận này");
        }
        commentLikeRepository.save(CommentLike.builder()
                .comment(comment)
                .user(userRepository.getReferenceById(userId))
                .build());
        commentRepository.addLikeCount(commentId, 1);
    }

    @Transactional
    public void unlikeComment(Long commentId) {
        Long userId = SecurityUtils.getCurrentUserId();
        findInteractableComment(commentId, userId);
        CommentLike like = commentLikeRepository.findByCommentIdAndUserId(commentId, userId)
                .orElseThrow(() -> ApiException.notFound("Bạn chưa thích bình luận này"));
        commentLikeRepository.delete(like);
        commentRepository.addLikeCount(commentId, -1);
    }

    /**
     * Video phải xem được theo bảng 6.2 (riêng tư, chỉ người theo dõi...) VÀ đã đăng:
     * chủ video xem được bản nháp của mình nhưng không thích / bình luận trên bản nháp.
     */
    private Video findInteractableVideo(Long videoId, Long userId) {
        Video video = videoAccessPolicy.findViewableVideo(videoId, userId);
        checkPublished(video);
        return video;
    }

    /** Bình luận phải tồn tại và video chứa nó phải xem được (giống findInteractableVideo). */
    private Comment findInteractableComment(Long commentId, Long userId) {
        Comment comment = findComment(commentId);
        videoAccessPolicy.checkViewable(comment.getVideo(), userId);
        checkPublished(comment.getVideo());
        return comment;
    }

    private static void checkPublished(Video video) {
        if (video.getStatus() != VideoStatus.PUBLISHED) {
            throw ApiException.notFound(VideoAccessPolicy.NOT_VIEWABLE);
        }
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
