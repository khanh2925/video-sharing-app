package com.vsa.backend.ai.recommend;

import com.vsa.backend.ai.tracking.EventType;
import com.vsa.backend.ai.tracking.UserEvent;
import com.vsa.backend.ai.tracking.UserEventRepository;
import com.vsa.backend.dtos.response.VideoResponse;
import com.vsa.backend.entities.Video;
import com.vsa.backend.entities.VideoLike;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.VideoLikeRepository;
import com.vsa.backend.repositories.VideoRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Tìm kiếm theo nghĩa và gợi ý "Dành cho bạn" — Khánh.
 * Dữ liệu đầu vào là nhật ký hành vi user_events (phần tracking của Thanh).
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final int SEARCH_SIZE = 10;
    private static final int FOR_YOU_SIZE = 10;
    private static final int EVENT_LIMIT = 200;         // xét 200 hành vi gần nhất
    private static final int TASTE_SIZE = 5;            // 5 video điểm cao nhất làm "gu"
    private static final int QUERY_LIMIT = 3;           // + 3 từ khoá tìm gần nhất
    private static final double WEIGHT_LIKE = 3.0;

    private final ObjectProvider<VectorStore> vectorStoreProvider;
    private final VideoRepository videoRepository;
    private final VideoLikeRepository videoLikeRepository;
    private final UserEventRepository userEventRepository;
    private final VideoMapper videoMapper;

    /** GET /api/search/semantic?q=... */
    @Transactional(readOnly = true)
    public List<VideoResponse> semanticSearch(String query) {
        if (query == null || query.isBlank()) {
            throw ApiException.badRequest("Nhập nội dung cần tìm");
        }
        List<Document> docs = search(SearchRequest.builder()
                .query(query.trim())
                .topK(SEARCH_SIZE)
                .similarityThreshold(0.6)               // dưới 0.6 coi như không liên quan
                .build());
        return toVideos(docs, Set.of(), SEARCH_SIZE);
    }

    /**
     * GET /api/videos/me/for-you
     * 1. Chấm điểm từng video người dùng đã tương tác (bảng user_events + lượt thích), theo trọng số và độ mới.
     * 2. Ghép nội dung 5 video điểm cao nhất + từ khoá tìm gần đây thành "gu", Gemini đổi thành một vector.
     * 3. Tìm video gần vector đó nhất, bỏ video của mình và video đã xem.
     */
    @Transactional(readOnly = true)
    public List<VideoResponse> forYou() {
        Long me = SecurityUtils.getCurrentUserId();
        List<UserEvent> events = userEventRepository.findByUserIdOrderByCreatedAtDesc(me, PageRequest.of(0, EVENT_LIMIT));
        List<VideoLike> likes = videoLikeRepository.findVisibleLikes(me, me, VideoStatus.PUBLISHED,
                Visibility.PUBLIC, Visibility.FOLLOWERS, PageRequest.of(0, EVENT_LIMIT)).getContent();

        // 1. Điểm sở thích của từng video
        Map<Long, Double> score = new HashMap<>();
        Set<Long> seen = new HashSet<>();
        List<String> recentQueries = new ArrayList<>();
        for (UserEvent e : events) {
            if (e.getEventType() == EventType.SEARCH) {
                if (recentQueries.size() < QUERY_LIMIT) {
                    recentQueries.add(e.getQuery());
                }
                continue;
            }
            if (e.getVideoId() == null) {
                continue;
            }
            seen.add(e.getVideoId());
            score.merge(e.getVideoId(), weightOf(e) * recency(e.getCreatedAt()), Double::sum);
        }
        for (VideoLike like : likes) {            // lượt thích có từ trước khi có tracking (dữ liệu mẫu)
            Long id = like.getVideo().getId();
            seen.add(id);
            score.putIfAbsent(id, WEIGHT_LIKE * recency(like.getCreatedAt()));
        }

        List<Long> top = score.entrySet().stream()
                .filter(en -> en.getValue() > 0)  // video bị lướt qua, bỏ thích thì điểm âm → bỏ
                .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
                .limit(TASTE_SIZE)
                .map(Map.Entry::getKey)
                .toList();
        if (top.isEmpty() && recentQueries.isEmpty()) {
            return List.of();                     // chưa có dữ liệu → app hiện Trending thay thế
        }

        // 2. "Gu" của người dùng thành một đoạn chữ, Gemini đổi thành vector khi tìm
        Map<Long, Video> byId = videoRepository.findAllById(top).stream()
                .collect(Collectors.toMap(Video::getId, Function.identity()));
        List<String> parts = new ArrayList<>();
        top.stream().map(byId::get).filter(Objects::nonNull)
                .map(VideoEmbeddingService::contentOf)
                .forEach(parts::add);
        if (!recentQueries.isEmpty()) {
            parts.add("Gần đây tìm: " + String.join(", ", recentQueries));
        }

        // 3. Tìm video gần nhất, trừ video của mình
        List<Document> docs = search(SearchRequest.builder()
                .query(String.join("\n\n", parts))
                .topK(FOR_YOU_SIZE * 4)                 // lấy dư vì sẽ bỏ video đã xem
                .filterExpression("ownerId != " + me)
                .build());
        List<VideoResponse> result = toVideos(docs, seen, FOR_YOU_SIZE);
        // Xem gần hết kho rồi thì cho xem lại video cũ còn hơn trống
        return result.isEmpty() ? toVideos(docs, Set.of(), FOR_YOU_SIZE) : result;
    }

    /** Trọng số: thích mạnh hơn xem; xem hết mạnh hơn xem lướt; lướt qua và bỏ thích là tín hiệu âm. */
    private static double weightOf(UserEvent e) {
        return switch (e.getEventType()) {
            case LIKE -> WEIGHT_LIKE;
            case COMMENT -> 2.0;
            case WATCH -> 2.0 * watchRatio(e);
            case VIEW -> 0.5;
            case SKIP -> -1.0;
            case UNLIKE -> -WEIGHT_LIKE;
            case SEARCH -> 0;
        };
    }

    /** Tỉ lệ xem hết, từ 0 tới 1. */
    private static double watchRatio(UserEvent e) {
        if (e.getWatchMs() == null || e.getDurationMs() == null || e.getDurationMs() <= 0) {
            return 0.5;
        }
        return Math.min(1.0, (double) e.getWatchMs() / e.getDurationMs());
    }

    /** Hôm nay = 1, một tuần trước ≈ 0.5, càng cũ càng nhẹ. */
    private static double recency(LocalDateTime at) {
        if (at == null) {
            return 1.0;
        }
        double days = Math.max(0, Duration.between(at, LocalDateTime.now()).toHours() / 24.0);
        return 1.0 / (1.0 + days / 7.0);
    }

    /** Gọi kho vector (cần Gemini đổi câu tìm thành vector); lỗi hết lượt, mất mạng → báo dễ hiểu. */
    private List<Document> search(SearchRequest request) {
        try {
            return store().similaritySearch(request);
        } catch (ApiException e) {
            throw e;
        } catch (RuntimeException e) {
            throw ApiException.unavailable("Tính năng gợi ý đang bận hoặc hết lượt, thử lại sau ít phút");
        }
    }

    private VectorStore store() {
        VectorStore store = vectorStoreProvider.getIfAvailable();
        if (store == null) {
            throw ApiException.badRequest("Tính năng AI chưa được bật");
        }
        return store;
    }

    /** Đổi kết quả trong kho vector thành video thật trong MySQL, giữ đúng thứ tự gần nhất trước. */
    private List<VideoResponse> toVideos(List<Document> docs, Set<Long> exclude, int limit) {
        List<Long> ids = docs.stream()
                .map(d -> ((Number) d.getMetadata().get("videoId")).longValue())
                .filter(id -> !exclude.contains(id))
                .distinct()
                .toList();
        Map<Long, Video> byId = videoRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Video::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        return ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .filter(v -> v.getStatus() == VideoStatus.PUBLISHED && v.getVisibility() == Visibility.PUBLIC)
                .limit(limit)
                .map(v -> videoMapper.toResponse(v, false))
                .toList();
    }
}
