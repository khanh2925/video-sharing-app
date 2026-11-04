package com.vsa.backend.ai.trending;

import com.vsa.backend.ai.tracking.EventType;
import com.vsa.backend.ai.tracking.UserEvent;
import com.vsa.backend.ai.tracking.UserEventRepository;
import com.vsa.backend.repositories.NotificationRepository;
import com.vsa.backend.repositories.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Test chấm điểm xu hướng (công thức R, E, V, F, P), không cần MySQL. */
class TrendingScoreServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 4, 12, 0);
    private static final double EPS = 1e-3;
    private static final Long OWNER = 1000L;   // tác giả của mọi video mẫu

    private UserEventRepository userEventRepository;
    private NotificationRepository notificationRepository;
    private VideoRepository videoRepository;
    private TrendingScoreService service;
    private long nextEventId = 1;

    @BeforeEach
    void setUp() {
        userEventRepository = mock(UserEventRepository.class);
        notificationRepository = mock(NotificationRepository.class);
        videoRepository = mock(VideoRepository.class);
        TrendingProperties props = new TrendingProperties(72, 24, 0.9, 10, 48, 20,
                new TrendingProperties.Mix(0.35, 0.25, 0.30, 0.10),
                new TrendingProperties.Retention(0.65, 0.35),
                new TrendingProperties.Engagement(0.10, 0.20, 0.30));
        service = new TrendingScoreService(userEventRepository, notificationRepository, videoRepository, props);
    }

    @Test
    void khongCoHanhVi_chiConDiemDoMoi() {
        Map<Long, TrendingBreakdown> r = byId(service.compute(List.of(), List.of(),
                List.of(video(1L, NOW), video(2L, NOW.minusHours(48))), NOW));
        assertEquals(10.0, r.get(1L).score(), EPS);                 // 100 × 0.10 × exp(0)
        assertEquals(10.0 * Math.exp(-1), r.get(2L).score(), EPS);  // sau 48 giờ
    }

    @Test
    void videoTangNhanhGanDay_dungTruocVideoCu() {
        List<UserEvent> events = new ArrayList<>();
        for (long u = 1; u <= 5; u++) {
            events.add(watch(u, 2L, 9_000, 10_000, NOW.minusMinutes(30)));      // video mới: 5 người xem gần hết
            events.add(watch(u + 10, 1L, 3_000, 10_000, NOW.minusHours(30)));   // video cũ: xem ít, đã hơn 24 giờ
        }
        List<TrendingBreakdown> ranking = service.compute(events, List.of(),
                List.of(video(1L, NOW.minusDays(30)), video(2L, NOW.minusHours(2))), NOW);
        assertEquals(2L, ranking.get(0).videoId());
        assertEquals(1.0, ranking.get(0).velocity(), EPS);
        assertEquals(0.0, ranking.get(1).velocity(), EPS);
    }

    @Test
    void motLuotXemHet_khongVuotVideoNhieuBangChung() {
        List<UserEvent> events = new ArrayList<>();
        events.add(watch(1L, 1L, 10_000, 10_000, NOW.minusMinutes(10)));       // A: 1 người, xem hết 100%
        for (long u = 2; u <= 31; u++) {                                       // B: 30 người, 80% xem hết
            events.add(watch(u, 2L, u % 5 == 0 ? 4_000 : 10_000, 10_000, NOW.minusMinutes(10)));
        }
        Map<Long, TrendingBreakdown> r = byId(service.compute(events, List.of(),
                List.of(video(1L, NOW), video(2L, NOW)), NOW));
        assertTrue(r.get(2L).score() > r.get(1L).score(), "1 lượt xem hết bị làm trơn về mức trung bình, không thắng 30 lượt xem");
    }

    @Test
    void videoImLang_khongDungTrenVideoCoNguoiXemThat() {
        List<UserEvent> events = List.of(
                watch(5L, 1L, 9_000, 10_000, NOW.minusHours(30)),
                event(5L, 1L, EventType.LIKE, NOW.minusHours(30)));
        Map<Long, TrendingBreakdown> r = byId(service.compute(events, List.of(),
                List.of(video(1L, NOW.minusDays(10)), video(2L, NOW.minusHours(12))), NOW));
        assertEquals(0.0, r.get(2L).retention(), EPS);
        assertEquals(0.0, r.get(2L).engagement(), EPS);
        assertEquals(0.0, r.get(2L).penalty(), EPS);
        assertTrue(r.get(1L).score() > r.get(2L).score());
    }

    @Test
    void tacGiaTuXemTuThichTuChiaSe_khongDuocTinh() {
        List<UserEvent> events = List.of(
                watch(OWNER, 1L, 10_000, 10_000, NOW),
                event(OWNER, 1L, EventType.LIKE, NOW),
                event(OWNER, 1L, EventType.COMMENT, NOW));
        TrendingBreakdown b = service.compute(events, List.of(share(OWNER, 1L)), List.of(video(1L, NOW)), NOW).get(0);
        assertEquals(0, b.validViews() + b.likes() + b.comments() + b.shares());
        assertEquals(10.0, b.score(), EPS);   // chỉ còn điểm độ mới
    }

    @Test
    void moXemNhieuLan_chiTinhMotLuotXemHopLe() {
        List<UserEvent> events = List.of(
                watch(5L, 1L, 3_000, 10_000, NOW.minusMinutes(3)),
                watch(5L, 1L, 10_000, 10_000, NOW.minusMinutes(2)),
                watch(5L, 1L, 4_000, 10_000, NOW.minusMinutes(1)));
        TrendingBreakdown b = service.compute(events, List.of(), List.of(video(1L, NOW)), NOW).get(0);
        assertEquals(1, b.validViews());
        assertEquals(1, b.completes());   // lấy lần xem lâu nhất
    }

    @Test
    void luotQuaRoiXemLai_tinhLaXemKhongPhaiLuot() {
        List<UserEvent> events = List.of(
                event(5L, 1L, EventType.SKIP, NOW.minusMinutes(5)),
                watch(5L, 1L, 6_000, 10_000, NOW.minusMinutes(1)),
                event(6L, 1L, EventType.SKIP, NOW.minusMinutes(1)));
        TrendingBreakdown b = service.compute(events, List.of(), List.of(video(1L, NOW)), NOW).get(0);
        assertEquals(1, b.validViews());
        assertEquals(1, b.skips());
        assertTrue(b.penalty() > 0);
    }

    @Test
    void thichRoiBoThich_khongConLuotThich() {
        List<UserEvent> events = List.of(
                event(5L, 1L, EventType.LIKE, NOW.minusMinutes(10)),
                event(5L, 1L, EventType.UNLIKE, NOW.minusMinutes(5)),
                event(6L, 1L, EventType.LIKE, NOW.minusMinutes(5)));
        TrendingBreakdown b = service.compute(events, List.of(), List.of(video(1L, NOW)), NOW).get(0);
        assertEquals(1, b.likes());
    }

    @Test
    void chiaSeChoNhieuBan_tinhMotLan_vaTangEngagement() {
        List<UserEvent> events = List.of(
                watch(5L, 1L, 5_000, 10_000, NOW), watch(6L, 2L, 5_000, 10_000, NOW));
        List<NotificationRepository.ShareRow> shares = List.of(share(5L, 1L), share(5L, 1L));
        Map<Long, TrendingBreakdown> r = byId(service.compute(events, shares,
                List.of(video(1L, NOW), video(2L, NOW)), NOW));
        assertEquals(1, r.get(1L).shares());
        assertTrue(r.get(1L).engagement() > r.get(2L).engagement());
        assertTrue(r.get(1L).score() > r.get(2L).score());
    }

    @Test
    void boQuaVideoKhongConCongKhai() {
        List<UserEvent> events = List.of(event(5L, 99L, EventType.LIKE, NOW));
        List<TrendingBreakdown> ranking = service.compute(events, List.of(share(5L, 99L)), List.of(video(1L, NOW)), NOW);
        assertEquals(1, ranking.size());
        assertEquals(0, ranking.get(0).likes());
    }

    @Test
    void refresh_ghiDiemBangUpdateRieng_vaLuuBangXepHang() {
        when(userEventRepository.findVideoEventsSince(any())).thenReturn(List.of());
        when(notificationRepository.findSharesSince(any())).thenReturn(List.of());
        when(videoRepository.findPublicForTrending()).thenReturn(List.of(video(1L, NOW), video(2L, NOW.minusHours(48))));

        assertEquals(2, service.refresh(NOW));

        verify(userEventRepository).findVideoEventsSince(NOW.minusHours(72));
        verify(videoRepository).updateTrendingScore(eq(1L), eq(10.0));
        verify(videoRepository, times(2)).updateTrendingScore(any(), anyDouble());
        verify(videoRepository, never()).save(any());
        TrendingScoreService.TrendingReport report = service.latest(1);
        assertEquals(NOW, report.calculatedAt());
        assertEquals(1, report.items().size());
        assertEquals(1L, report.items().get(0).videoId());
    }

    // ===== dữ liệu mẫu =====

    private static Map<Long, TrendingBreakdown> byId(List<TrendingBreakdown> list) {
        return list.stream().collect(Collectors.toMap(TrendingBreakdown::videoId, Function.identity()));
    }

    private UserEvent event(Long userId, Long videoId, EventType type, LocalDateTime at) {
        return UserEvent.builder().id(nextEventId++).userId(userId).videoId(videoId)
                .eventType(type).createdAt(at).build();
    }

    private UserEvent watch(Long userId, Long videoId, int watchMs, int durationMs, LocalDateTime at) {
        UserEvent e = event(userId, videoId, EventType.WATCH, at);
        e.setWatchMs(watchMs);
        e.setDurationMs(durationMs);
        return e;
    }

    private static VideoRepository.TrendingRow video(Long id, LocalDateTime createdAt) {
        return new VideoRepository.TrendingRow() {
            @Override
            public Long getId() {
                return id;
            }

            @Override
            public String getTitle() {
                return "Video " + id;
            }

            @Override
            public LocalDateTime getCreatedAt() {
                return createdAt;
            }

            @Override
            public Long getOwnerId() {
                return OWNER;
            }
        };
    }

    private static NotificationRepository.ShareRow share(Long userId, Long videoId) {
        return new NotificationRepository.ShareRow() {
            @Override
            public Long getUserId() {
                return userId;
            }

            @Override
            public Long getVideoId() {
                return videoId;
            }
        };
    }
}
