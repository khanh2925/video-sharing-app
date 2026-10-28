package com.vsa.backend.mappers;

import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.Hashtag;
import com.vsa.backend.entities.Video;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Chuyển Video sang VideoResponse.
 * Phải gọi bên trong hàm service có @Transactional, vì owner, topic, audio, hashtags là LAZY
 * (chỉ tải từ DB khi chạm tới).
 * Thanh làm trang chủ / xem video thì dùng lại lớp này, truyền liked = đã thích hay chưa.
 */
@Component
@RequiredArgsConstructor
public class VideoMapper {

    private final UserMapper userMapper;
    private final CatalogMapper catalogMapper;

    public VideoResponse toResponse(Video video, boolean liked) {
        return toResponse(video, liked, video.getViewCount(), video.getLikeCount(), video.getCommentCount());
    }

    /**
     * Giống hàm trên nhưng truyền bộ đếm từ ngoài vào. Dùng khi bộ đếm vừa được cộng thẳng trong DB
     * (vd VideoService.recordView) mà entity trong bộ nhớ vẫn giữ số cũ.
     */
    public VideoResponse toResponse(Video video, boolean liked, long viewCount, long likeCount, long commentCount) {
        return new VideoResponse(
                video.getId(),
                video.getTitle(),
                video.getDescription(),
                video.getVideoUrl(),
                video.getThumbnailUrl(),
                video.getFilter(),
                video.getVisibility(),
                video.getStatus(),
                video.isAllowComments(),
                viewCount,
                likeCount,
                commentCount,
                liked,
                video.getCreatedAt(),
                userMapper.toSummary(video.getOwner()),
                video.getTopic() == null ? null : catalogMapper.toTopicResponse(video.getTopic()),
                video.getAudio() == null ? null : catalogMapper.toAudioResponse(video.getAudio()),
                video.getHashtags().stream().map(Hashtag::getName).sorted().toList());
    }
}
