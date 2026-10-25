package com.vsa.backend.services;

import com.vsa.backend.dtos.request.CreateVideoRequest;
import com.vsa.backend.dtos.request.UpdateVideoRequest;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.Audio;
import com.vsa.backend.entities.Hashtag;
import com.vsa.backend.entities.Topic;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.AudioRepository;
import com.vsa.backend.repositories.CommentLikeRepository;
import com.vsa.backend.repositories.CommentRepository;
import com.vsa.backend.repositories.HashtagRepository;
import com.vsa.backend.repositories.TopicRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoLikeRepository;
import com.vsa.backend.repositories.VideoRepository;
import com.vsa.backend.utils.AppConstants;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Nghiệp vụ video phía người đăng: UC08 đăng video, UC09 (bộ lọc, nhạc đi kèm lúc đăng), UC10 quản lý video.
 * Phần xem video, trang chủ, thích, bình luận (UC05, UC11) Thanh thêm vào đây hoặc service riêng.
 */
@Service
@RequiredArgsConstructor
public class VideoService {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final TopicRepository topicRepository;
    private final AudioRepository audioRepository;
    private final HashtagRepository hashtagRepository;
    private final VideoLikeRepository videoLikeRepository;
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final FileStorageService fileStorageService;
    private final VideoMapper videoMapper;

    // ===================== UC08 + UC09: đăng video =====================

    @Transactional
    public VideoResponse create(MultipartFile file, MultipartFile thumbnail, CreateVideoRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User owner = userRepository.findById(currentUserId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));

        // 1. Kiểm tra mọi thứ trong DB TRƯỚC khi lưu file, để lỗi thì không sinh file rác
        Topic topic = request.topicId() == null ? null : topicRepository.findById(request.topicId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy chủ đề"));
        Audio audio = request.audioId() == null ? null : audioRepository.findById(request.audioId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài nhạc"));
        Set<String> hashtagNames = normalizeHashtags(request.hashtags());

        // 2. Lưu file (FileStorageService tự kiểm tra định dạng, dung lượng theo VIDEO_MAX_SIZE_MB)
        String videoUrl = fileStorageService.saveVideo(file);
        String thumbnailUrl = null;
        try {
            if (thumbnail != null && !thumbnail.isEmpty()) {
                thumbnailUrl = fileStorageService.saveImage(thumbnail, FileStorageService.THUMBNAIL_DIR);
            }

            // 3. Lưu video
            Video video = Video.builder()
                    .title(request.title().trim())
                    .description(trimToNull(request.description()))
                    .videoUrl(videoUrl)
                    .thumbnailUrl(thumbnailUrl)
                    .filter(trimToNull(request.filter()))
                    .visibility(request.visibility() != null ? request.visibility() : Visibility.PUBLIC)
                    .allowComments(!Boolean.FALSE.equals(request.allowComments()))   // không gửi = cho phép
                    .status(Boolean.TRUE.equals(request.draft()) ? VideoStatus.DRAFT : VideoStatus.PUBLISHED)
                    .owner(owner)
                    .topic(topic)
                    .audio(audio)
                    .hashtags(findOrCreateHashtags(hashtagNames))
                    .build();
            videoRepository.saveAndFlush(video);

            return videoMapper.toResponse(video, false);
        } catch (RuntimeException e) {
            // Lưu DB lỗi thì xoá file vừa ghi, rồi ném lỗi tiếp cho GlobalExceptionHandler
            fileStorageService.delete(videoUrl);
            fileStorageService.delete(thumbnailUrl);
            throw e;
        }
    }

    // ===================== UC10: quản lý video =====================

    /** Danh sách bản nháp của tôi (menu "Video nháp"), mới nhất trước. */
    @Transactional(readOnly = true)
    public PageResponse<VideoResponse> getMyDrafts(Pageable pageable) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return PageResponse.of(
                videoRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(currentUserId, VideoStatus.DRAFT, pageable),
                video -> videoMapper.toResponse(video, false));
    }

    /** Sửa tiêu đề, mô tả, chế độ hiển thị, bật/tắt bình luận; publish = true để đăng bản nháp. */
    @Transactional
    public VideoResponse update(Long videoId, UpdateVideoRequest request) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        Video video = findOwnVideo(videoId, currentUserId);

        if (request.title() != null) {
            if (request.title().isBlank()) {
                throw ApiException.badRequest("Tiêu đề không được để trống");
            }
            video.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            video.setDescription(trimToNull(request.description()));
        }
        if (request.visibility() != null) {
            video.setVisibility(request.visibility());
        }
        if (request.allowComments() != null) {
            video.setAllowComments(request.allowComments());
        }
        if (Boolean.TRUE.equals(request.publish()) && video.getStatus() == VideoStatus.DRAFT) {
            video.setStatus(VideoStatus.PUBLISHED);
        }
        // Không cần gọi save: video đang được JPA theo dõi, hết hàm @Transactional sẽ tự UPDATE

        boolean liked = videoLikeRepository.existsByVideoIdAndUserId(videoId, currentUserId);
        return videoMapper.toResponse(video, liked);
    }

    /**
     * Xoá video (C8). Thứ tự bắt buộc vì khoá ngoại:
     * lượt thích bình luận → bình luận → lượt thích video → video (bảng video_hashtags tự xoá theo) → file.
     */
    @Transactional
    public void delete(Long videoId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        Video video = findOwnVideo(videoId, currentUserId);
        String videoUrl = video.getVideoUrl();
        String thumbnailUrl = video.getThumbnailUrl();

        commentLikeRepository.deleteAllOnCommentsOfVideo(videoId);
        commentRepository.deleteAllByVideoId(videoId);
        videoLikeRepository.deleteAllByVideoId(videoId);
        videoRepository.deleteById(videoId);
        videoRepository.flush();   // chạy câu DELETE ngay, lỗi DB thì dừng ở đây, chưa đụng tới file

        fileStorageService.delete(videoUrl);
        fileStorageService.delete(thumbnailUrl);
    }

    // ===================== hàm phụ =====================

    /** Video phải tồn tại, thuộc về mình và chưa bị quản trị viên ẩn (R5, R15). */
    private Video findOwnVideo(Long videoId, Long currentUserId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy video"));
        if (!video.getOwner().getId().equals(currentUserId)) {
            throw ApiException.forbidden("Bạn không có quyền với video này");
        }
        if (video.getStatus() == VideoStatus.HIDDEN) {
            throw ApiException.forbidden("Video đã bị quản trị viên ẩn");
        }
        return video;
    }

    /**
     * Chuẩn hoá hashtag: tách theo dấu cách / dấu phẩy, bỏ dấu #, viết thường, bỏ trùng.
     * Vd ["#DuLich #dalat", "dulich"] → {"dulich", "dalat"}
     */
    static Set<String> normalizeHashtags(List<String> input) {
        Set<String> result = new LinkedHashSet<>();
        if (input == null) {
            return result;
        }
        for (String item : input) {
            if (item == null) {
                continue;
            }
            for (String part : item.split("[\\s,]+")) {
                String name = part.replaceAll("^#+", "").toLowerCase(Locale.ROOT);
                if (name.isEmpty()) {
                    continue;
                }
                if (name.length() > AppConstants.HASHTAG_MAX) {
                    throw ApiException.badRequest("Mỗi hashtag tối đa " + AppConstants.HASHTAG_MAX + " ký tự");
                }
                result.add(name);
            }
        }
        return result;
    }

    /** Hashtag đã có thì dùng lại dòng cũ, chưa có thì tạo mới. */
    private Set<Hashtag> findOrCreateHashtags(Set<String> names) {
        Set<Hashtag> hashtags = new HashSet<>();
        for (String name : names) {
            hashtags.add(hashtagRepository.findByName(name)
                    .orElseGet(() -> hashtagRepository.save(Hashtag.builder().name(name).build())));
        }
        return hashtags;
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
