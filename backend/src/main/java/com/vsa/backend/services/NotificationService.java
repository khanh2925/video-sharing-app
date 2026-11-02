package com.vsa.backend.services;

import com.vsa.backend.dtos.request.ShareVideoRequest;
import com.vsa.backend.dtos.response.NotificationResponse;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.entities.Notification;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.NotificationType;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.NotificationRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.utils.AppConstants;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Map;

/**
 * UC20 Thông báo: tạo khi có người thích, bình luận video của mình, theo dõi mình, chia sẻ video cho mình.
 * App tải lại danh sách khi mở màn Thông báo và đếm số chưa đọc khi về Trang chủ (không đẩy tức thì).
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final VideoAccessPolicy videoAccessPolicy;

    /** Tạo thông báo. Tự làm với chính mình (thích video của mình...) thì bỏ qua. */
    @Transactional
    public void notify(User recipient, Long actorId, NotificationType type, Video video, String text) {
        if (recipient.getId().equals(actorId)) {
            return;
        }
        notificationRepository.save(Notification.builder()
                .recipient(recipient)
                .actor(userRepository.getReferenceById(actorId))
                .type(type)
                .video(video)
                .text(shorten(text))
                .build());
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getMine(Pageable pageable) {
        Long me = SecurityUtils.getCurrentUserId();
        return PageResponse.of(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(me, pageable),
                this::toResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> countUnread() {
        return Map.of("count", notificationRepository.countByRecipientIdAndReadFalse(SecurityUtils.getCurrentUserId()));
    }

    @Transactional
    public void markAllRead() {
        notificationRepository.markAllRead(SecurityUtils.getCurrentUserId());
    }

    @Transactional
    public void markRead(Long id) {
        Notification n = notificationRepository.findByIdAndRecipientId(id, SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy thông báo"));
        n.setRead(true);
    }

    /**
     * Chia sẻ video cho bạn bè: mỗi người nhận một thông báo SHARE.
     * Mình phải xem được video; người nhận không xem được (vd video "Người theo dõi" mà họ chưa theo dõi)
     * thì bỏ qua người đó. Trả về số người đã gửi được.
     */
    @Transactional
    public Map<String, Integer> shareVideo(Long videoId, ShareVideoRequest request) {
        Long me = SecurityUtils.getCurrentUserId();
        Video video = videoAccessPolicy.findViewableVideo(videoId, me);
        int sent = 0;
        for (Long userId : new LinkedHashSet<>(request.userIds())) {
            if (userId == null || userId.equals(me)) {
                continue;
            }
            User recipient = userRepository.findById(userId).orElse(null);
            if (recipient == null || recipient.isLocked()) {
                continue;
            }
            try {
                videoAccessPolicy.checkViewable(video, userId);
            } catch (ApiException e) {
                continue;
            }
            notify(recipient, me, NotificationType.SHARE, video, request.message());
            sent++;
        }
        if (sent == 0) {
            throw ApiException.badRequest("Không gửi được cho ai: người nhận không xem được video này");
        }
        return Map.of("sent", sent);
    }

    private NotificationResponse toResponse(Notification n) {
        Video v = n.getVideo();
        return new NotificationResponse(n.getId(), n.getType(), userMapper.toSummary(n.getActor()),
                v == null ? null : v.getId(),
                v == null ? null : v.getTitle(),
                v == null ? null : v.getThumbnailUrl(),
                n.getText(), n.isRead(), n.getCreatedAt());
    }

    private static String shorten(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String t = text.trim();
        int max = AppConstants.NOTIFICATION_TEXT_MAX;
        return t.length() <= max ? t : t.substring(0, max - 1) + "…";
    }
}
