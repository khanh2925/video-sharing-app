package com.vsa.backend.services;

import com.vsa.backend.dtos.response.FollowUserResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.entities.Follow;
import com.vsa.backend.entities.SuggestionDismissal;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.NotificationType;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.SuggestionDismissalRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Nghiệp vụ theo dõi (UC12).
 *  follow / unfollow                  – nút Theo dõi ở hồ sơ, video, live, tìm kiếm, tab Bạn bè
 *  getFollowers / getFollowing        – 2 tab ở màn Bạn bè (khách cũng xem được)
 *  getSuggestions / dismissSuggestion – mục "Gợi ý cho bạn" và nút X ẩn gợi ý (cần đăng nhập)
 *  toFollowUsers                      – đổi danh sách User thành FollowUserResponse (SearchService dùng lại)
 */
@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SuggestionDismissalRepository suggestionDismissalRepository;

    /**
     * Bấm 2 lần (mạng chậm) không lỗi: đã theo dõi rồi thì thôi.
     * Hai request đến CÙNG LÚC thì cả hai đều qua được bước existsBy..., request sau bị ràng buộc
     * unique (follower_id, following_id) chặn → bắt lỗi đó và coi như thành công.
     * Cố ý KHÔNG đặt @Transactional ở hàm này: lỗi ràng buộc ném ra trong một transaction chung sẽ đánh dấu
     * cả transaction phải rollback, tới lúc commit vẫn lỗi. Mỗi lệnh repository tự chạy transaction riêng.
     */
    public void follow(Long targetId) {
        Long me = SecurityUtils.getCurrentUserId();
        if (targetId.equals(me)) {
            throw ApiException.badRequest("Không thể tự theo dõi chính mình");
        }
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng id = " + targetId));
        if (followRepository.existsByFollowerIdAndFollowingId(me, targetId)) {
            return;
        }
        try {
            followRepository.save(Follow.builder()
                    .follower(userRepository.getReferenceById(me))      // chỉ cần id, không phải đọc cả User
                    .following(target)
                    .build());
            notificationService.notify(target, me, NotificationType.FOLLOW, null, null);
        } catch (DataIntegrityViolationException e) {
            // Request khác vừa theo dõi xong trước mình: kết quả vẫn là "đang theo dõi" → không báo lỗi
        }
    }

    /** Chưa theo dõi mà bấm bỏ theo dõi cũng không lỗi. */
    @Transactional
    public void unfollow(Long targetId) {
        Long me = SecurityUtils.getCurrentUserId();
        followRepository.findByFollowerIdAndFollowingId(me, targetId)
                .ifPresent(followRepository::delete);
    }

    /** Tab "Người theo dõi" của userId */
    @Transactional(readOnly = true)
    public PageResponse<FollowUserResponse> getFollowers(Long userId, Pageable pageable) {
        checkUserExists(userId);
        Page<User> users = followRepository.findByFollowingIdOrderByCreatedAtDesc(userId, pageable)
                .map(Follow::getFollower);
        return toPage(users);
    }

    /** Tab "Đang theo dõi" của userId */
    @Transactional(readOnly = true)
    public PageResponse<FollowUserResponse> getFollowing(Long userId, Pageable pageable) {
        checkUserExists(userId);
        Page<User> users = followRepository.findByFollowerIdOrderByCreatedAtDesc(userId, pageable)
                .map(Follow::getFollowing);
        return toPage(users);
    }

    /**
     * "Gợi ý cho bạn": lấy lần lượt 3 nhóm, nhóm trước xếp trên, bỏ trùng, đủ size người thì dừng.
     *  1. Bạn của bạn: người mà những người mình đang theo dõi cũng theo dõi (nhiều bạn chung xếp trước).
     *  2. Theo dõi lại: người đang theo dõi mình mà mình chưa theo dõi lại.
     *  3. Người nổi bật: nhiều người theo dõi nhất (cho tài khoản mới chưa theo dõi ai).
     * Cả 3 nhóm đều loại: chính mình, người đã theo dõi, người đã bấm X, quản trị viên, tài khoản bị khoá.
     */
    @Transactional(readOnly = true)
    public List<FollowUserResponse> getSuggestions(int size) {
        Long me = SecurityUtils.getCurrentUserId();
        Pageable top = PageRequest.of(0, size);
        Set<Long> ids = new LinkedHashSet<>();                         // giữ đúng thứ tự thêm vào, tự bỏ trùng
        for (Object[] row : followRepository.findFriendsOfFollowing(me, top)) {
            ids.add((Long) row[0]);
        }
        if (ids.size() < size) {
            ids.addAll(followRepository.findFollowersNotFollowedBack(me, top));
        }
        if (ids.size() < size) {
            userRepository.findSuggestions(me, top).forEach(u -> ids.add(u.getId()));
        }
        List<Long> picked = ids.stream().limit(size).toList();
        if (picked.isEmpty()) {
            return List.of();
        }
        // findAllById không giữ thứ tự → xếp lại theo picked
        Map<Long, User> byId = new HashMap<>();
        userRepository.findAllById(picked).forEach(u -> byId.put(u.getId(), u));
        List<User> users = new ArrayList<>();
        for (Long id : picked) {
            User u = byId.get(id);
            if (u != null) {
                users.add(u);
            }
        }
        return toFollowUsers(users);
    }

    /**
     * Bấm X ở một gợi ý: lưu lại để không gợi ý người đó nữa (kể cả mở lại app, đổi máy).
     * Bấm 2 lần không lỗi. Giống follow(): không đặt @Transactional để bắt được lỗi trùng khi 2 request đến cùng lúc.
     */
    public void dismissSuggestion(Long targetId) {
        Long me = SecurityUtils.getCurrentUserId();
        if (targetId.equals(me)) {
            throw ApiException.badRequest("Không thể ẩn chính mình");
        }
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng id = " + targetId));
        if (suggestionDismissalRepository.existsByUserIdAndDismissedUserId(me, targetId)) {
            return;
        }
        try {
            suggestionDismissalRepository.save(SuggestionDismissal.builder()
                    .user(userRepository.getReferenceById(me))
                    .dismissedUser(target)
                    .build());
        } catch (DataIntegrityViolationException e) {
            // request khác vừa lưu xong → kết quả vẫn là "đã ẩn"
        }
    }

    /**
     * Ghép thêm số người theo dõi và 2 cờ following / followsMe cho cả danh sách.
     * Chỉ 3 câu truy vấn cho cả trang, không hỏi DB từng người.
     */
    @Transactional(readOnly = true)
    public List<FollowUserResponse> toFollowUsers(List<User> users) {
        if (users.isEmpty()) {
            return List.of();
        }
        List<Long> ids = users.stream().map(User::getId).toList();
        Long viewerId = SecurityUtils.getCurrentUserIdOrNull();     // khách → null

        Map<Long, Long> followerCounts = new HashMap<>();
        for (Object[] row : followRepository.countFollowersAmong(ids)) {
            followerCounts.put((Long) row[0], (Long) row[1]);
        }
        Set<Long> iFollow = viewerId == null ? Set.of() : followRepository.findFollowingIdsAmong(viewerId, ids);
        Set<Long> followMe = viewerId == null ? Set.of() : followRepository.findFollowerIdsAmong(viewerId, ids);

        return users.stream()
                .map(u -> new FollowUserResponse(
                        u.getId(),
                        u.getUsername(),
                        u.getDisplayName(),
                        u.getAvatarUrl(),
                        followerCounts.getOrDefault(u.getId(), 0L),
                        iFollow.contains(u.getId()),
                        followMe.contains(u.getId()),
                        u.getId().equals(viewerId)))
                .toList();
    }

    // ===== Hàm phụ =====

    private PageResponse<FollowUserResponse> toPage(Page<User> users) {
        List<FollowUserResponse> content = toFollowUsers(users.getContent());
        return new PageResponse<>(content, users.getNumber(), users.getSize(),
                users.getTotalElements(), users.getTotalPages(), users.isLast());
    }

    private void checkUserExists(Long id) {
        if (!userRepository.existsById(id)) {
            throw ApiException.notFound("Không tìm thấy người dùng id = " + id);
        }
    }
}
