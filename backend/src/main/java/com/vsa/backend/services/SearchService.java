package com.vsa.backend.services;

import com.vsa.backend.dtos.response.SearchResponse;
import com.vsa.backend.entities.LiveStream;
import com.vsa.backend.entities.User;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.LiveStatus;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.mappers.CatalogMapper;
import com.vsa.backend.mappers.VideoMapper;
import com.vsa.backend.repositories.AudioRepository;
import com.vsa.backend.repositories.HashtagRepository;
import com.vsa.backend.repositories.LiveStreamRepository;
import com.vsa.backend.repositories.UserRepository;
import com.vsa.backend.repositories.VideoLikeRepository;
import com.vsa.backend.repositories.VideoRepository;
import com.vsa.backend.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final VideoRepository videoRepository;
    private final VideoLikeRepository videoLikeRepository;
    private final UserRepository userRepository;
    private final LiveStreamRepository liveStreamRepository;
    private final AudioRepository audioRepository;
    private final HashtagRepository hashtagRepository;
    private final VideoMapper videoMapper;
    private final CatalogMapper catalogMapper;
    private final LiveStreamService liveStreamService;
    private final FollowService followService;

    @Transactional(readOnly = true)
    public SearchResponse search(String rawQuery, String rawType, Pageable pageable) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        String type = rawType == null ? "videos" : rawType.trim().toLowerCase(Locale.ROOT);

        return switch (type) {
            case "videos", "trending" -> searchVideos(query, type, pageable);
            case "accounts" -> searchAccounts(query, type, pageable);
            case "streaming", "lives" -> searchLives(query, "streaming", pageable);
            case "audio" -> map(type,
                    audioRepository.findByTitleContainingIgnoreCaseOrArtistContainingIgnoreCase(
                            query, query, pageable), catalogMapper::toAudioResponse);
            default -> throw ApiException.badRequest(
                    "Loại tìm kiếm phải là videos, trending, accounts, streaming hoặc audio");
        };
    }

    @Transactional(readOnly = true)
    public List<String> suggestions(String query) {
        String normalized = query == null ? "" : query.trim();
        return hashtagRepository.findTop10ByNameContainingIgnoreCaseOrderByNameAsc(normalized).stream()
                .map(hashtag -> hashtag.getName())
                .toList();
    }

    private SearchResponse searchVideos(String query, String type, Pageable pageable) {
        Long currentUserId = SecurityUtils.getCurrentUserIdOrNull();
        Page<Video> page = query.isBlank()
                ? videoRepository.findByStatusAndVisibilityOrderByViewCountDesc(
                        VideoStatus.PUBLISHED, Visibility.PUBLIC, pageable)
                : videoRepository.searchPublic(escapeLike(query), VideoStatus.PUBLISHED, Visibility.PUBLIC, pageable);
        // Cờ "đã thích" lấy 1 lần cho cả trang (tránh N+1); khách hoặc trang rỗng thì khỏi hỏi DB
        Set<Long> likedIds = currentUserId == null || page.isEmpty()
                ? Set.of()
                : videoLikeRepository.findLikedVideoIds(currentUserId,
                        page.getContent().stream().map(Video::getId).toList());
        return map(type, page, video -> videoMapper.toResponse(video, likedIds.contains(video.getId())));
    }

    private SearchResponse searchLives(String query, String type, Pageable pageable) {
        List<LiveStream> filtered = liveStreamRepository.findByStatusOrderByStartedAtDesc(LiveStatus.LIVE).stream()
                .filter(live -> query.isBlank() || live.getTitle().toLowerCase(Locale.ROOT)
                        .contains(query.toLowerCase(Locale.ROOT)))
                .toList();
        int start = Math.min((int) pageable.getOffset(), filtered.size());
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        Page<LiveStream> page = new PageImpl<>(filtered.subList(start, end), pageable, filtered.size());
        return map(type, page, liveStreamService::toResponse);
    }

    // Kết quả tài khoản kèm số người theo dõi và cờ đang theo dõi (UC12) để app hiện đúng nút.
    // Chỉ người dùng thường chưa bị khoá (không lộ tài khoản quản trị, tài khoản bị khoá)
    private SearchResponse searchAccounts(String query, String type, Pageable pageable) {
        Page<User> users = userRepository.searchAccounts(escapeLike(query), pageable);
        return new SearchResponse(type, followService.toFollowUsers(users.getContent()),
                users.getNumber(), users.getSize(), users.getTotalElements(), users.getTotalPages(), users.isLast());
    }

    /**
     * Thoát ký tự đặc biệt của LIKE để tìm đúng chữ người dùng gõ: "50%" không còn khớp mọi thứ,
     * "a_b" không khớp "axb". Ký tự thoát là '!' (khớp với "escape '!'" trong câu truy vấn).
     */
    static String escapeLike(String query) {
        return query.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    private <T, R> SearchResponse map(String type, Page<T> page, Function<T, R> mapper) {
        return new SearchResponse(type, page.getContent().stream().map(mapper).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isLast());
    }
}
