package com.vsa.backend.services;

import com.vsa.backend.dtos.request.UpdateProfileRequest;
import com.vsa.backend.dtos.response.AuthUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.dtos.response.UserProfileResponse;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.entities.VideoLike;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoLikeRepository;
import com.vsa.backend.repositories.VideoRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

/**
 * Nghiệp vụ hồ sơ người dùng.
 *  UC06 Xem hồ sơ người dùng       – getProfile, getUserVideos (tab Videos), getLikedVideos (tab Liked)
 *  UC07 Quản lý thông tin cá nhân  – updateMyProfile (tên, tiểu sử), updateMyAvatar (ảnh đại diện)
 *  UC12 Theo dõi                    – xem FollowService
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final VideoRepository videoRepository;
    private final VideoLikeRepository videoLikeRepository;
    private final UserMapper userMapper;
    private final VideoMapper videoMapper;
    private final FileStorageService fileStorageService;

    // ===== UC06 – Xem hồ sơ người dùng =====

    /** Khách cũng xem được; đã đăng nhập thì biết thêm mình có đang theo dõi người này không. */
    public UserProfileResponse getProfile(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng id = " + id));

        Long viewerId = SecurityUtils.getCurrentUserIdOrNull();       // ① khách → null
        boolean me = id.equals(viewerId);                             // ② đang mở hồ sơ của chính mình
        boolean following = viewerId != null && !me                   // ③ khách, chính mình → khỏi hỏi DB
                && followRepository.existsByFollowerIdAndFollowingId(viewerId, id);

        long followingCount = followRepository.countByFollowerId(id);
        long followerCount = followRepository.countByFollowingId(id);
        long likeCount = videoRepository.sumLikeCountByOwner(id, VideoStatus.PUBLISHED);   // ④ không tính nháp, video bị ẩn

        return userMapper.toProfileResponse(user, followingCount, followerCount, likeCount, following, me);
    }

    /**
     * Tab Videos: video đã đăng của người này, CHỈ những video người xem được phép thấy (bảng 6.2).
     * Bản nháp không hiện ở đây (xem ở menu "Video nháp" – UC10).
     * Có @Transactional vì VideoMapper đọc owner, topic, audio, hashtags (LAZY).
     */
    @Transactional(readOnly = true)
    public PageResponse<VideoResponse> getUserVideos(Long id, Pageable pageable) {
        checkUserExists(id);
        Long viewerId = SecurityUtils.getCurrentUserIdOrNull();

        Page<Video> videos = videoRepository.findByOwnerIdAndStatusAndVisibilityInOrderByCreatedAtDesc(
                id, VideoStatus.PUBLISHED, allowedVisibilities(id, viewerId), pageable);

        Set<Long> likedIds = likedVideoIds(viewerId, videos.getContent());
        return PageResponse.of(videos, video -> videoMapper.toResponse(video, likedIds.contains(video.getId())));
    }

    /** Tab Liked: video người này đã thích, mới thích trước; vẫn lọc theo quyền xem của người đang xem. */
    @Transactional(readOnly = true)
    public PageResponse<VideoResponse> getLikedVideos(Long id, Pageable pageable) {
        checkUserExists(id);
        Long viewerId = SecurityUtils.getCurrentUserIdOrNull();

        Page<Video> videos = videoLikeRepository.findVisibleLikes(id, viewerId, VideoStatus.PUBLISHED,
                        Visibility.PUBLIC, Visibility.FOLLOWERS, pageable)
                .map(VideoLike::getVideo);                            // Page<VideoLike> → Page<Video>

        Set<Long> likedIds = likedVideoIds(viewerId, videos.getContent());
        return PageResponse.of(videos, video -> videoMapper.toResponse(video, likedIds.contains(video.getId())));
    }

    // ===== UC07 – Quản lý thông tin cá nhân =====

    /** Sửa tên hiển thị, tiểu sử của chính mình. Trả về thông tin mới để app cập nhật ngay. */
    @Transactional
    public AuthUserResponse updateMyProfile(UpdateProfileRequest request) {
        User user = currentUser();
        user.setDisplayName(request.displayName().trim());
        String bio = request.bio() == null ? null : request.bio().trim();
        user.setBio(bio == null || bio.isEmpty() ? null : bio);     // chuỗi rỗng → xoá tiểu sử
        return userMapper.toAuthUserResponse(user);                  // @Transactional tự lưu thay đổi
    }

    /** Đổi ảnh đại diện: lưu ảnh mới vào uploads/avatars rồi mới xoá ảnh cũ. */
    @Transactional
    public AuthUserResponse updateMyAvatar(MultipartFile file) {
        User user = currentUser();
        String oldUrl = user.getAvatarUrl();
        user.setAvatarUrl(fileStorageService.saveImage(file, FileStorageService.AVATAR_DIR));  // tự kiểm tra định dạng, dung lượng
        fileStorageService.delete(oldUrl);
        return userMapper.toAuthUserResponse(user);
    }

    // ===== Hàm phụ =====

    private User currentUser() {
        Long id = SecurityUtils.getCurrentUserId();
        return userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng id = " + id));
    }

    private void checkUserExists(Long id) {
        if (!userRepository.existsById(id)) {
            throw ApiException.notFound("Không tìm thấy người dùng id = " + id);
        }
    }

    // Bảng 6.2: chủ hồ sơ thấy hết; người theo dõi thấy PUBLIC + FOLLOWERS; còn lại (kể cả khách) chỉ PUBLIC
    private List<Visibility> allowedVisibilities(Long ownerId, Long viewerId) {
        if (ownerId.equals(viewerId)) {
            return List.of(Visibility.values());
        }
        if (viewerId != null && followRepository.existsByFollowerIdAndFollowingId(viewerId, ownerId)) {
            return List.of(Visibility.PUBLIC, Visibility.FOLLOWERS);
        }
        return List.of(Visibility.PUBLIC);
    }

    // Id các video trong trang mà người xem đã thích (khách hoặc trang rỗng → khỏi hỏi DB)
    private Set<Long> likedVideoIds(Long viewerId, List<Video> videos) {
        if (viewerId == null || videos.isEmpty()) {
            return Set.of();
        }
        List<Long> videoIds = videos.stream().map(Video::getId).toList();
        return videoLikeRepository.findLikedVideoIds(viewerId, videoIds);
    }
}
