package com.vsa.backend.services;

import com.vsa.backend.configurations.AppProperties;
import com.vsa.backend.dtos.response.FollowUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.entities.Follow;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.Role;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Nghiệp vụ theo dõi người dùng (UC12 – màn hình Follow, nút Follow ở Profile Details).
 *  follow / unfollow, danh sách followers / following, gợi ý tài khoản.
 * Quy tắc R6: mỗi cặp theo dõi chỉ 1 dòng (unique trong DB), không tự theo dõi chính mình.
 */
@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final AppProperties appProperties;

    // ===== UC12 – Theo dõi / bỏ theo dõi =====

    @Transactional
    public void follow(Long id) {
        Long meId = SecurityUtils.getCurrentUserId();                       // chưa đăng nhập → 401
        if (id.equals(meId)) {
            throw ApiException.badRequest("Bạn không thể tự theo dõi chính mình");
        }
        User target = findUser(id);
        if (followRepository.existsByFollowerIdAndFollowingId(meId, id)) {
            throw ApiException.conflict("Bạn đã theo dõi người này");
        }
        followRepository.save(Follow.builder()
                .follower(userRepository.getReferenceById(meId))            // ① chỉ cần id, không tải cả User
                .following(target)
                .build());
    }

    @Transactional
    public void unfollow(Long id) {
        Long meId = SecurityUtils.getCurrentUserId();
        Follow follow = followRepository.findByFollowerIdAndFollowingId(meId, id)
                .orElseThrow(() -> ApiException.notFound("Bạn chưa theo dõi người này"));
        followRepository.delete(follow);
    }

    // ===== UC12 – Danh sách followers / following =====

    /** Tab "x followers": những người đang theo dõi người này, mới theo dõi trước. */
    @Transactional(readOnly = true)
    public PageResponse<FollowUserResponse> getFollowers(Long id, Pageable pageable) {
        checkUserExists(id);
        Page<User> users = followRepository.findByFollowingIdOrderByCreatedAtDesc(id, pageable)
                .map(Follow::getFollower);
        return toFollowUserPage(users);
    }

    /** Tab "y following": những người mà người này đang theo dõi. */
    @Transactional(readOnly = true)
    public PageResponse<FollowUserResponse> getFollowing(Long id, Pageable pageable) {
        checkUserExists(id);
        Page<User> users = followRepository.findByFollowerIdOrderByCreatedAtDesc(id, pageable)
                .map(Follow::getFollowing);
        return toFollowUserPage(users);
    }

    // ===== UC12 – Gợi ý tài khoản =====

    /** "Suggestions for you": tối đa app.paging.suggestion-size người mình chưa theo dõi (ẩn gợi ý chỉ làm trên app). */
    @Transactional(readOnly = true)
    public List<FollowUserResponse> getSuggestions() {
        Long meId = SecurityUtils.getCurrentUserId();
        int size = appProperties.paging().suggestionSize();
        return userRepository.findSuggestions(meId, Role.USER, PageRequest.of(0, size)).stream()
                .map(user -> userMapper.toFollowUser(user, false, false))
                .toList();
    }

    // ===== Hàm phụ =====

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng id = " + id));
    }

    private void checkUserExists(Long id) {
        if (!userRepository.existsById(id)) {
            throw ApiException.notFound("Không tìm thấy người dùng id = " + id);
        }
    }

    // Gắn cờ following / me cho từng dòng theo NGƯỜI ĐANG XEM (khách → đều false)
    private PageResponse<FollowUserResponse> toFollowUserPage(Page<User> users) {
        Long viewerId = SecurityUtils.getCurrentUserIdOrNull();
        Set<Long> followingIds = followingIdsOf(viewerId, users.getContent());
        return PageResponse.of(users, user -> userMapper.toFollowUser(user,
                followingIds.contains(user.getId()),
                user.getId().equals(viewerId)));
    }

    private Set<Long> followingIdsOf(Long viewerId, List<User> users) {
        if (viewerId == null || users.isEmpty()) {
            return Set.of();
        }
        List<Long> userIds = users.stream().map(User::getId).toList();
        return followRepository.findFollowingIdsIn(viewerId, userIds);
    }
}
