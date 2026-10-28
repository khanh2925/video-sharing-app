package com.vsa.backend.services;

import com.vsa.backend.dtos.response.UserProfileResponse;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Nghiệp vụ hồ sơ người dùng.
 *  UC06 Xem hồ sơ người dùng       – getProfile
 *  UC07 Quản lý thông tin cá nhân  – (làm tiếp)
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final VideoRepository videoRepository;
    private final UserMapper userMapper;

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
}
