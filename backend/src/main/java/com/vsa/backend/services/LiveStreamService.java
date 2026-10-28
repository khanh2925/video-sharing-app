package com.vsa.backend.services;

import com.vsa.backend.dtos.request.CreateLiveRequest;
import com.vsa.backend.dtos.response.LiveMessageResponse;
import com.vsa.backend.dtos.response.LiveSocketEventResponse;
import com.vsa.backend.dtos.response.LiveStreamResponse;
import com.vsa.backend.entities.LiveMessage;
import com.vsa.backend.entities.LiveStream;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.LiveMessageType;
import com.vsa.backend.enums.LiveStatus;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.LiveMessageRepository;
import com.vsa.backend.repositories.LiveStreamRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class LiveStreamService {

    private static final Set<String> ALLOWED_REACTIONS = Set.of("heart", "like", "smile");

    private final LiveStreamRepository liveStreamRepository;
    private final LiveMessageRepository liveMessageRepository;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<Long, Set<Long>> viewers = new ConcurrentHashMap<>();

    @Transactional
    public LiveStreamResponse create(CreateLiveRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (liveStreamRepository.existsByHostIdAndStatus(userId, LiveStatus.LIVE)) {
            throw ApiException.conflict("Bạn đang có một buổi live chưa kết thúc");
        }
        Video source = videoRepository.findById(request.sourceVideoId())
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy video nguồn"));
        if (!source.getOwner().getId().equals(userId)) {
            throw ApiException.forbidden("Bạn chỉ được dùng video của mình để phát livestream");
        }
        if (source.getStatus() != VideoStatus.PUBLISHED) {
            throw ApiException.badRequest("Video nguồn phải ở trạng thái đã đăng");
        }
        User host = userRepository.getReferenceById(userId);
        LiveStream live = liveStreamRepository.save(LiveStream.builder()
                .title(request.title().trim())
                .sourceVideoUrl(source.getVideoUrl())
                .thumbnailUrl(source.getThumbnailUrl())
                .productName(trimToNull(request.productName()))
                .productPrice(request.productPrice() == null ? 0 : request.productPrice())
                .productImageUrl(trimToNull(request.productImageUrl()))
                .startedAt(LocalDateTime.now())
                .host(host)
                .build());
        return toResponse(live);
    }

    @Transactional
    public LiveStreamResponse end(Long liveId) {
        Long userId = SecurityUtils.getCurrentUserId();
        LiveStream live = findLive(liveId);
        if (!live.getHost().getId().equals(userId)) {
            throw ApiException.forbidden("Chỉ chủ phòng mới được kết thúc livestream");
        }
        if (live.getStatus() == LiveStatus.ENDED) {
            throw ApiException.conflict("Buổi live đã kết thúc");
        }
        int viewerCount = viewers.getOrDefault(liveId, Set.of()).size();
        live.setViewerCount(viewerCount);
        live.setStatus(LiveStatus.ENDED);
        live.setEndedAt(LocalDateTime.now());
        viewers.remove(liveId);
        LiveStreamResponse response = toResponse(live);
        messagingTemplate.convertAndSend(topic(liveId),
                new LiveSocketEventResponse("ENDED", viewerCount, null, response));
        return response;
    }

    @Transactional(readOnly = true)
    public List<LiveStreamResponse> getActive() {
        SecurityUtils.getCurrentUserId();
        return liveStreamRepository.findByStatusOrderByStartedAtDesc(LiveStatus.LIVE).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LiveStreamResponse getById(Long liveId) {
        SecurityUtils.getCurrentUserId();
        return toResponse(findLive(liveId));
    }

    @Transactional(readOnly = true)
    public List<LiveMessageResponse> getMessages(Long liveId) {
        SecurityUtils.getCurrentUserId();
        findLive(liveId);
        return liveMessageRepository.findByLiveStreamIdOrderByCreatedAtAsc(liveId).stream()
                .map(this::toMessageResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LiveStreamResponse toResponse(LiveStream live) {
        int currentViewerCount = live.getStatus() == LiveStatus.LIVE
                ? viewers.getOrDefault(live.getId(), Set.of()).size()
                : live.getViewerCount();
        return new LiveStreamResponse(live.getId(), live.getTitle(), live.getSourceVideoUrl(),
                live.getThumbnailUrl(), live.getStatus(), currentViewerCount, live.getProductName(),
                live.getProductPrice(), live.getProductImageUrl(), live.getStartedAt(), live.getEndedAt(),
                userMapper.toSummary(live.getHost()));
    }

    @Transactional
    public void join(Long liveId, Long userId) {
        LiveStream live = findActiveLive(liveId);
        viewers.computeIfAbsent(liveId, ignored -> ConcurrentHashMap.newKeySet()).add(userId);
        broadcastViewers(live.getId());
    }

    public void leave(Long liveId, Long userId) {
        Set<Long> liveViewers = viewers.get(liveId);
        if (liveViewers != null) {
            liveViewers.remove(userId);
            broadcastViewers(liveId);
        }
    }

    public void leaveAll(Long userId) {
        viewers.forEach((liveId, liveViewers) -> {
            if (liveViewers.remove(userId)) {
                broadcastViewers(liveId);
            }
        });
    }

    @Transactional
    public LiveMessageResponse sendMessage(Long liveId, Long userId, LiveMessageType type, String rawContent) {
        LiveStream live = findActiveLive(liveId);
        String content = rawContent == null ? "" : rawContent.trim();
        if (content.isEmpty()) {
            throw ApiException.badRequest("Nội dung không được để trống");
        }
        if (type == LiveMessageType.REACTION && !ALLOWED_REACTIONS.contains(content)) {
            throw ApiException.badRequest("Cảm xúc phải là heart, like hoặc smile");
        }
        LiveMessage message = liveMessageRepository.save(LiveMessage.builder()
                .liveStream(live)
                .sender(userRepository.getReferenceById(userId))
                .type(type)
                .content(content)
                .build());
        LiveMessageResponse response = toMessageResponse(message);
        messagingTemplate.convertAndSend(topic(liveId),
                new LiveSocketEventResponse(type.name(), null, response, null));
        return response;
    }

    private void broadcastViewers(Long liveId) {
        int count = viewers.getOrDefault(liveId, Set.of()).size();
        messagingTemplate.convertAndSend(topic(liveId),
                new LiveSocketEventResponse("VIEWERS", count, null, null));
    }

    private LiveMessageResponse toMessageResponse(LiveMessage message) {
        return new LiveMessageResponse(message.getId(), message.getType(), message.getContent(),
                message.getCreatedAt(), userMapper.toSummary(message.getSender()));
    }

    private LiveStream findLive(Long liveId) {
        return liveStreamRepository.findById(liveId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy livestream"));
    }

    private LiveStream findActiveLive(Long liveId) {
        LiveStream live = findLive(liveId);
        if (live.getStatus() != LiveStatus.LIVE) {
            throw ApiException.conflict("Buổi live đã kết thúc");
        }
        return live;
    }

    private static String topic(Long liveId) {
        return "/topic/live/" + liveId;
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
