package com.vsa.backend.services;

import com.vsa.backend.dtos.response.StoryGroupResponse;
import com.vsa.backend.dtos.response.StoryResponse;
import com.vsa.backend.entities.Audio;
import com.vsa.backend.entities.Story;
import com.vsa.backend.entities.StoryView;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.MediaType;
import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.StoryMapper;
import com.vsa.backend.mappers.UserMapper;
import com.vsa.backend.repositories.AudioRepository;
import com.vsa.backend.repositories.FollowRepository;
import com.vsa.backend.repositories.StoryRepository;
import com.vsa.backend.repositories.StoryViewRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Nghiệp vụ story: UC17 đăng / xoá story, UC18 xem story.
 * Độ dài tối đa và thời gian tồn tại lấy từ SystemSettingService (quản trị viên chỉnh), không viết cứng.
 */
@Service
@RequiredArgsConstructor
public class StoryService {

    private final StoryRepository storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final SystemSettingService systemSettingService;
    private final StoryMapper storyMapper;
    private final UserMapper userMapper;
    private final AudioRepository audioRepository;

    // ===================== UC17: đăng, xoá story =====================

    /**
     * @param durationSec độ dài video tính bằng giây, app đọc từ file rồi gửi lên (ảnh thì bỏ trống).
     *                    Server không tự đọc được độ dài video nên tin số app gửi, chỉ kiểm tra giới hạn.
     * @param audioId     nhạc nền chọn ở màn Chọn nhạc (không bắt buộc)
     */
    @Transactional
    public StoryResponse create(MultipartFile file, Integer durationSec, Long audioId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User owner = userRepository.findById(currentUserId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy người dùng"));

        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Chưa chọn file");
        }
        boolean isVideo = fileStorageService.isVideo(file);
        int duration = 0;
        if (isVideo) {
            int maxSec = systemSettingService.getInt(SettingKey.STORY_MAX_DURATION_SEC);
            if (durationSec == null || durationSec <= 0) {
                throw ApiException.badRequest("Thiếu độ dài video (durationSec)");
            }
            if (durationSec > maxSec) {
                throw ApiException.badRequest("Video story tối đa " + maxSec + " giây");
            }
            duration = durationSec;
        }

        Audio audio = audioId == null ? null : audioRepository.findById(audioId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài nhạc id = " + audioId));

        String mediaUrl = fileStorageService.saveStoryFile(file);   // tự kiểm tra định dạng, dung lượng
        try {
            int lifetimeHours = systemSettingService.getInt(SettingKey.STORY_LIFETIME_HOURS);
            Story story = Story.builder()
                    .mediaUrl(mediaUrl)
                    .mediaType(isVideo ? MediaType.VIDEO : MediaType.IMAGE)
                    .durationSec(duration)
                    .expiresAt(LocalDateTime.now().plusHours(lifetimeHours))   // R11
                    .owner(owner)
                    .audio(audio)
                    .build();
            storyRepository.saveAndFlush(story);
            return storyMapper.toResponse(story, true);
        } catch (RuntimeException e) {
            fileStorageService.delete(mediaUrl);
            throw e;
        }
    }

    /** Xoá story của mình (lượt xem tự xoá theo nhờ cascade trong entity Story). */
    @Transactional
    public void delete(Long storyId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy story"));
        if (!story.getOwner().getId().equals(currentUserId)) {
            throw ApiException.forbidden("Bạn chỉ được xoá story của mình");
        }
        String mediaUrl = story.getMediaUrl();
        storyRepository.delete(story);
        storyRepository.flush();
        fileStorageService.delete(mediaUrl);
    }

    // ===================== UC18: xem story =====================

    /**
     * Hàng Stories trên trang chủ: nhóm của tôi đứng đầu, sau đó những người tôi theo dõi có story còn hạn.
     * Nhóm còn story chưa xem (viền xanh) xếp trước nhóm đã xem hết (viền xám); cùng loại thì ai đăng mới hơn lên trước.
     */
    @Transactional(readOnly = true)
    public List<StoryGroupResponse> getFeed() {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        List<Long> ownerIds = new ArrayList<>(followRepository.findFollowingIds(currentUserId));
        ownerIds.add(currentUserId);
        List<Story> stories = storyRepository
                .findByOwnerIdInAndExpiresAtAfterOrderByCreatedAtAsc(ownerIds, LocalDateTime.now());
        if (stories.isEmpty()) {
            return List.of();
        }

        Set<Long> viewedIds = new HashSet<>(storyViewRepository.findViewedStoryIds(
                currentUserId, stories.stream().map(Story::getId).toList()));

        // Gom story theo người đăng, giữ thứ tự cũ → mới trong từng nhóm
        Map<Long, List<Story>> storiesByOwner = new LinkedHashMap<>();
        for (Story story : stories) {
            storiesByOwner.computeIfAbsent(story.getOwner().getId(), id -> new ArrayList<>()).add(story);
        }

        StoryGroupResponse myGroup = null;
        List<StoryGroupResponse> otherGroups = new ArrayList<>();
        Map<StoryGroupResponse, LocalDateTime> latestOf = new HashMap<>();

        for (List<Story> ownerStories : storiesByOwner.values()) {
            User owner = ownerStories.get(0).getOwner();
            boolean mine = owner.getId().equals(currentUserId);

            List<StoryResponse> items = ownerStories.stream()
                    .map(s -> storyMapper.toResponse(s, mine || viewedIds.contains(s.getId())))
                    .toList();
            boolean allViewed = items.stream().allMatch(StoryResponse::viewed);
            StoryGroupResponse group = new StoryGroupResponse(userMapper.toSummary(owner), mine, allViewed, items);

            if (mine) {
                myGroup = group;
            } else {
                otherGroups.add(group);
                latestOf.put(group, ownerStories.get(ownerStories.size() - 1).getCreatedAt());
            }
        }

        otherGroups.sort(Comparator
                .comparing(StoryGroupResponse::allViewed)                              // chưa xem hết lên trước
                .thenComparing(latestOf::get, Comparator.reverseOrder()));             // đăng mới hơn lên trước

        List<StoryGroupResponse> result = new ArrayList<>();
        if (myGroup != null) {
            result.add(myGroup);
        }
        result.addAll(otherGroups);
        return result;
    }

    /** Ghi nhận đã xem một story (R6: mỗi người chỉ 1 lượt/story). Gọi lại nhiều lần cũng không sao. */
    @Transactional
    public void markViewed(Long storyId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy story"));
        if (story.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw ApiException.notFound("Story đã hết hạn");
        }
        if (story.getOwner().getId().equals(currentUserId)
                || storyViewRepository.existsByStoryIdAndViewerId(storyId, currentUserId)) {
            return;   // story của mình hoặc đã xem rồi thì không ghi thêm
        }
        storyViewRepository.save(StoryView.builder()
                .story(story)
                .viewer(userRepository.getReferenceById(currentUserId))   // chỉ cần id, không phải tải cả User
                .build());
    }
}
