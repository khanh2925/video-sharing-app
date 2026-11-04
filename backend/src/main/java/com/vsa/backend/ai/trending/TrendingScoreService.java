package com.vsa.backend.ai.trending;

import com.vsa.backend.ai.tracking.EventType;
import com.vsa.backend.ai.tracking.UserEvent;
import com.vsa.backend.ai.tracking.UserEventRepository;
import com.vsa.backend.repositories.NotificationRepository;
import com.vsa.backend.repositories.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Chấm điểm xu hướng cho mục "Top trending" (UC05), theo tài liệu "Thiết kế thuật toán Top Trending & Dành cho bạn":
 *
 *   TrendingScore = max(0, 100 × (0.35R + 0.25E + 0.30V + 0.10F) − P)
 *
 *   R  Retention   = 0.65 × tỉ lệ xem hết + 0.35 × tỉ lệ thời gian xem (cả hai làm trơn Bayes)
 *   E  Engagement  = tỉ lệ thích, bình luận, chia sẻ trên số người đã tới video (làm trơn), chia cho video cao nhất
 *   V  Velocity    = log(1 + lượt xem hợp lệ trong velocityHours giờ qua), chia cho video cao nhất
 *   F  Freshness   = exp(−tuổi video theo giờ / 48)
 *   P  Penalty     = skipPenalty × tỉ lệ lướt qua (làm trơn)
 *
 * "Lượt xem hợp lệ" = sự kiện WATCH (app chỉ gửi khi xem từ 2 giây trở lên). Mỗi người chỉ có 1 lượt xem hợp lệ,
 * 1 lượt thích, 1 bình luận, 1 lượt chia sẻ cho mỗi video: mở đi mở lại không đẩy được video lên.
 * Hành vi của chính tác giả không được tính.
 * Không dùng tổng lượt xem tích luỹ: video cũ nhiều view không đứng top mãi.
 * Video chưa ai tới trong cửa sổ thời gian thì R, E, P = 0, chỉ còn F: dữ liệu đồ án thưa, nếu lấy mức trung bình
 * (như làm trơn Bayes với 0 mẫu) thì video im lặng sẽ đứng trên video có người xem thật.
 *
 * TrendingScheduler gọi refresh() định kỳ (mặc định 10 phút), ghi vào cột videos.trending_score; API Trending chỉ việc ORDER BY cột này.
 * Không gọi Gemini: chạy được cả khi tắt AI, không tốn quota.
 */
@Service
@RequiredArgsConstructor
public class TrendingScoreService {

    private final UserEventRepository userEventRepository;
    private final NotificationRepository notificationRepository;
    private final VideoRepository videoRepository;
    private final TrendingProperties properties;

    /** Kết quả lần tính gần nhất, cao điểm trước (cho trang quản trị xem R, E, V, F). */
    private volatile TrendingReport latest = new TrendingReport(null, List.of());

    public record TrendingReport(LocalDateTime calculatedAt, List<TrendingBreakdown> items) {
    }

    /** Tính và ghi điểm cho mọi video công khai đã đăng. Trả về số video đã cập nhật. */
    @Transactional
    public int refresh(LocalDateTime now) {
        LocalDateTime since = now.minusHours(properties.windowHours());
        List<TrendingBreakdown> ranking = compute(
                userEventRepository.findVideoEventsSince(since),
                notificationRepository.findSharesSince(since),
                videoRepository.findPublicForTrending(),
                now);
        // UPDATE riêng cột trending_score, KHÔNG save cả entity: tránh ghi đè lượt xem/thích đang được cộng song song
        for (TrendingBreakdown b : ranking) {
            videoRepository.updateTrendingScore(b.videoId(), b.score());
        }
        latest = new TrendingReport(now, ranking);
        return ranking.size();
    }

    public TrendingReport latest(int limit) {
        TrendingReport r = latest;
        return new TrendingReport(r.calculatedAt(), r.items().stream().limit(Math.max(1, limit)).toList());
    }

    // ===================== phần tính toán thuần (không đụng DB) =====================

    /** Số liệu thô của một video trong cửa sổ thời gian. */
    private static final class Stats {
        int validViews;          // lượt xem hợp lệ (WATCH), mỗi người 1
        int recentViews;         // lượt xem hợp lệ trong velocityHours giờ qua
        int completes;           // lượt xem hết
        double watchRatioSum;    // tổng tỉ lệ thời gian xem của các lượt xem hợp lệ
        int skips;               // lướt qua dưới 2 giây và không xem lại
        int likes;
        int comments;
        int shares;
        /** Những người đã "tới" video: xem hợp lệ, thích, bình luận hoặc chia sẻ (ai tương tác thì chắc chắn đã xem). */
        final Set<String> reach = new HashSet<>();

        int attempts() {
            return validViews + skips;
        }
    }

    List<TrendingBreakdown> compute(List<UserEvent> events, List<NotificationRepository.ShareRow> shares,
                                    List<VideoRepository.TrendingRow> videos, LocalDateTime now) {
        Map<Long, Stats> stats = new HashMap<>();
        Map<Long, Long> ownerOf = new HashMap<>();
        for (VideoRepository.TrendingRow v : videos) {
            stats.put(v.getId(), new Stats());
            ownerOf.put(v.getId(), v.getOwnerId());
        }
        // Bỏ video không còn công khai và hành vi của chính tác giả (tự xem, tự thích không đẩy được video lên)
        List<UserEvent> counted = events.stream()
                .filter(e -> stats.containsKey(e.getVideoId()))
                .filter(e -> e.getUserId() == null || !e.getUserId().equals(ownerOf.get(e.getVideoId())))
                .toList();
        collectWatches(counted, stats, now.minusHours(properties.velocityHours()));
        collectLikesAndComments(counted, stats);
        Set<String> shared = new HashSet<>();
        for (NotificationRepository.ShareRow s : shares) {
            Stats st = stats.get(s.getVideoId());
            if (st != null && !s.getUserId().equals(ownerOf.get(s.getVideoId()))
                    && shared.add(s.getUserId() + "-" + s.getVideoId())) {
                st.shares++;
                st.reach.add("u" + s.getUserId());
            }
        }

        // Mức trung bình của cả kho, dùng làm "prior" khi làm trơn Bayes
        double totalValid = 0, totalAttempts = 0, totalCompletes = 0, totalRatio = 0, totalReach = 0;
        double totalLikes = 0, totalComments = 0, totalShares = 0, totalSkips = 0;
        for (Stats s : stats.values()) {
            totalValid += s.validViews;
            totalReach += s.reach.size();
            totalAttempts += s.attempts();
            totalCompletes += s.completes;
            totalRatio += s.watchRatioSum;
            totalLikes += s.likes;
            totalComments += s.comments;
            totalShares += s.shares;
            totalSkips += s.skips;
        }
        double priorComplete = ratio(totalCompletes, totalValid);
        double priorWatch = ratio(totalRatio, totalValid);
        double priorLike = ratio(totalLikes, totalReach);
        double priorComment = ratio(totalComments, totalReach);
        double priorShare = ratio(totalShares, totalReach);
        double priorSkip = ratio(totalSkips, totalAttempts);

        // Tỉ lệ tương tác và tốc độ đã làm trơn, rồi tìm giá trị lớn nhất để đưa về 0–1
        Map<Long, double[]> raw = new HashMap<>();
        double maxLike = 0, maxComment = 0, maxShare = 0, maxVelocity = 0;
        for (Map.Entry<Long, Stats> e : stats.entrySet()) {
            Stats s = e.getValue();
            int reach = s.reach.size();
            double like = reach == 0 ? 0 : smooth(s.likes, reach, priorLike);
            double comment = reach == 0 ? 0 : smooth(s.comments, reach, priorComment);
            double share = reach == 0 ? 0 : smooth(s.shares, reach, priorShare);
            double velocity = Math.log1p(s.recentViews);
            raw.put(e.getKey(), new double[]{like, comment, share, velocity});
            maxLike = Math.max(maxLike, like);
            maxComment = Math.max(maxComment, comment);
            maxShare = Math.max(maxShare, share);
            maxVelocity = Math.max(maxVelocity, velocity);
        }

        TrendingProperties.Mix mix = properties.mix();
        TrendingProperties.Retention rw = properties.retention();
        TrendingProperties.Engagement ew = properties.engagement();
        double engagementWeights = ew.like() + ew.comment() + ew.share();

        List<TrendingBreakdown> result = new ArrayList<>();
        for (VideoRepository.TrendingRow v : videos) {
            Stats s = stats.get(v.getId());
            double[] x = raw.get(v.getId());

            // Chưa ai tới video trong cửa sổ thời gian = chưa có bằng chứng → R, E, P = 0 (không lấy mức trung bình),
            // để video im lặng không đứng trên video có người xem thật; lúc đó chỉ còn điểm độ mới F.
            boolean evidence = !s.reach.isEmpty() || s.skips > 0;
            double r = s.reach.isEmpty() ? 0
                    : rw.completion() * smooth(s.completes, s.validViews, priorComplete)
                    + rw.watchRatio() * smooth(s.watchRatioSum, s.validViews, priorWatch);
            double e = engagementWeights <= 0 ? 0
                    : (ew.like() * scale(x[0], maxLike) + ew.comment() * scale(x[1], maxComment)
                    + ew.share() * scale(x[2], maxShare)) / engagementWeights;
            double vel = scale(x[3], maxVelocity);
            double f = freshness(v.getCreatedAt(), now);
            double p = evidence ? properties.skipPenalty() * smooth(s.skips, s.attempts(), priorSkip) : 0;

            double score = Math.max(0, 100 * (mix.retention() * r + mix.engagement() * e
                    + mix.velocity() * vel + mix.freshness() * f) - p);
            result.add(new TrendingBreakdown(v.getId(), v.getTitle(), round(score), round(r), round(e),
                    round(vel), round(f), round(p), s.validViews, s.completes, s.skips,
                    s.likes, s.comments, s.shares));
        }
        result.sort(Comparator.comparingDouble(TrendingBreakdown::score).reversed());
        return result;
    }

    /**
     * Lượt xem: mỗi người mỗi video giữ 1 kết quả. Có WATCH thì là lượt xem hợp lệ (lấy lần xem lâu nhất);
     * chỉ có SKIP thì là lướt qua. Khách (userId null) không gộp được nên mỗi sự kiện tính riêng.
     */
    private void collectWatches(List<UserEvent> events, Map<Long, Stats> stats, LocalDateTime recentSince) {
        Map<String, Watch> perUser = new HashMap<>();
        int guest = 0;
        for (UserEvent ev : events) {
            if (!stats.containsKey(ev.getVideoId())
                    || (ev.getEventType() != EventType.WATCH && ev.getEventType() != EventType.SKIP)) {
                continue;
            }
            String who = ev.getUserId() == null ? "guest" + (guest++) : "u" + ev.getUserId();
            Watch w = perUser.computeIfAbsent(who + "-" + ev.getVideoId(), k -> new Watch(who, ev.getVideoId()));
            if (ev.getEventType() == EventType.WATCH) {
                w.bestRatio = Math.max(w.bestRatio, watchRatio(ev));
                if (ev.getCreatedAt() != null && !ev.getCreatedAt().isBefore(recentSince)) {
                    w.recent = true;
                }
            }
        }
        for (Watch w : perUser.values()) {
            Stats s = stats.get(w.videoId);
            if (w.bestRatio < 0) {
                s.skips++;
                continue;
            }
            s.validViews++;
            s.reach.add(w.who);
            s.watchRatioSum += w.bestRatio;
            if (w.bestRatio >= properties.completeRatio()) {
                s.completes++;
            }
            if (w.recent) {
                s.recentViews++;
            }
        }
    }

    /** Kết quả xem của một người với một video. */
    private static final class Watch {
        final String who;        // "u<id>" hoặc "guest<n>"
        final Long videoId;
        double bestRatio = -1;   // tỉ lệ xem lâu nhất; −1 = chỉ lướt qua
        boolean recent;          // có lượt xem hợp lệ trong velocityHours giờ qua

        Watch(String who, Long videoId) {
            this.who = who;
            this.videoId = videoId;
        }
    }

    /** Thích: hành vi mới nhất giữa LIKE và UNLIKE của mỗi người quyết định. Bình luận: mỗi người tính 1. */
    private void collectLikesAndComments(List<UserEvent> events, Map<Long, Stats> stats) {
        Map<String, UserEvent> lastLike = new HashMap<>();
        Set<String> commented = new HashSet<>();
        for (UserEvent ev : events) {
            if (ev.getUserId() == null || !stats.containsKey(ev.getVideoId())) {
                continue;
            }
            String key = ev.getUserId() + "-" + ev.getVideoId();
            switch (ev.getEventType()) {
                case LIKE, UNLIKE -> lastLike.merge(key, ev, (a, b) -> isAfter(b, a) ? b : a);
                case COMMENT -> {
                    if (commented.add(key)) {
                        stats.get(ev.getVideoId()).comments++;
                        stats.get(ev.getVideoId()).reach.add("u" + ev.getUserId());
                    }
                }
                default -> {
                }
            }
        }
        for (UserEvent ev : lastLike.values()) {
            if (ev.getEventType() == EventType.LIKE) {
                stats.get(ev.getVideoId()).likes++;
                stats.get(ev.getVideoId()).reach.add("u" + ev.getUserId());
            }
        }
    }

    /** Làm trơn Bayes: (số lần + m × trung bình) / (số mẫu + m). Ít mẫu → gần trung bình; nhiều mẫu → gần số thật. */
    private double smooth(double count, double samples, double prior) {
        double m = properties.smoothingViews();
        return (count + m * prior) / (samples + m);
    }

    private static double ratio(double a, double b) {
        return b <= 0 ? 0 : a / b;
    }

    /** Chia cho giá trị lớn nhất để đưa về 0–1. */
    private static double scale(double value, double max) {
        return max <= 0 ? 0 : Math.min(1, value / max);
    }

    /** Tỉ lệ xem hết, từ 0 tới 1 (không có số liệu thì coi như xem nửa video). */
    private static double watchRatio(UserEvent e) {
        if (e.getWatchMs() == null || e.getDurationMs() == null || e.getDurationMs() <= 0) {
            return 0.5;
        }
        return Math.min(1.0, (double) e.getWatchMs() / e.getDurationMs());
    }

    /** F = exp(−tuổi theo giờ / freshnessHours): mới đăng = 1, sau 48 giờ ≈ 0.37. */
    private double freshness(LocalDateTime createdAt, LocalDateTime now) {
        if (createdAt == null) {
            return 0;
        }
        double hours = Math.max(0, Duration.between(createdAt, now).toMinutes() / 60.0);
        return Math.exp(-hours / properties.freshnessHours());
    }

    private static boolean isAfter(UserEvent b, UserEvent a) {
        if (b.getCreatedAt() == null || a.getCreatedAt() == null) {
            return b.getId() != null && a.getId() != null && b.getId() > a.getId();
        }
        return b.getCreatedAt().isAfter(a.getCreatedAt());
    }

    private static double round(double x) {
        return Math.round(x * 1000) / 1000.0;
    }
}
