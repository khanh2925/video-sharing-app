package com.vsa.backend.services;

import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Quy tắc "ai được xem video nào" (bảng 6.2 tài liệu nghiệp vụ), gom về một chỗ.
 * VideoService (xem chi tiết, tăng lượt xem) và InteractionService (thích, bình luận) cùng dùng,
 * để không có đường nào lách qua được video riêng tư / chỉ người theo dõi.
 * Không được xem thì luôn trả 404 (không cho biết video có tồn tại hay không).
 */
@Component
@RequiredArgsConstructor
public class VideoAccessPolicy {

    static final String NOT_VIEWABLE = "Video không tồn tại hoặc bạn không có quyền xem";

    private final VideoRepository videoRepository;
    private final FollowRepository followRepository;

    /** Tìm video theo id rồi kiểm tra quyền xem. viewerId = null là khách. */
    public Video findViewableVideo(Long videoId, Long viewerId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> ApiException.notFound(NOT_VIEWABLE));
        checkViewable(video, viewerId);
        return video;
    }

    /** Kiểm tra quyền xem với video đã có sẵn (vd video của một bình luận). */
    public void checkViewable(Video video, Long viewerId) {
        // Video bị quản trị viên ẩn: không ai xem được, kể cả chủ
        if (video.getStatus() == VideoStatus.HIDDEN) {
            throw ApiException.notFound(NOT_VIEWABLE);
        }

        boolean owner = viewerId != null && video.getOwner().getId().equals(viewerId);
        if (owner) {
            return;   // chủ video xem được cả bản nháp và video riêng tư
        }
        if (video.getStatus() != VideoStatus.PUBLISHED) {
            throw ApiException.notFound(NOT_VIEWABLE);
        }
        if (video.getVisibility() == Visibility.PRIVATE) {
            throw ApiException.notFound(NOT_VIEWABLE);
        }
        if (video.getVisibility() == Visibility.FOLLOWERS) {
            boolean following = viewerId != null
                    && followRepository.existsByFollowerIdAndFollowingId(viewerId, video.getOwner().getId());
            if (!following) {
                throw ApiException.notFound(NOT_VIEWABLE);
            }
        }
    }
}
