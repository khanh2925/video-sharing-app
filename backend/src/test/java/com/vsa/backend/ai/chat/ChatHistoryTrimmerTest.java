package com.vsa.backend.ai.chat;

import org.junit.jupiter.api.Test;
import org.springframework.ai.content.MediaContent;
import org.springframework.ai.tokenizer.JTokkitTokenCountEstimator;
import org.springframework.ai.tokenizer.TokenCountEstimator;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test cắt lịch sử chat theo token, không cần AI hay DB.
 * Bộ đếm giả: mỗi ký tự = 1 token, để dễ tính tay.
 */
class ChatHistoryTrimmerTest {

    private static final TokenCountEstimator ONE_TOKEN_PER_CHAR = new TokenCountEstimator() {
        @Override
        public int estimate(String text) {
            return text == null ? 0 : text.length();
        }

        @Override
        public int estimate(MediaContent content) {
            return 0;
        }

        @Override
        public int estimate(Iterable<MediaContent> contents) {
            return 0;
        }
    };

    @Test
    void duoiGioiHan_giuHet() {
        List<ChatTurn> history = List.of(new ChatTurn("user", "aaaa"), new ChatTurn("bot", "bbbb"));   // 8 token

        assertEquals(0, ChatHistoryTrimmer.countToDrop(history, 10, ONE_TOKEN_PER_CHAR));
    }

    @Test
    void vuotGioiHan_boTinCuNhatTruoc() {
        List<ChatTurn> history = List.of(
                new ChatTurn("user", "aaaa"),      // 4  ← cũ nhất, bỏ trước
                new ChatTurn("bot", "bbbbbb"),     // 6  ← bỏ tiếp
                new ChatTurn("user", "cc"),        // 2
                new ChatTurn("bot", "ddd"));       // 3   tổng 15

        // giới hạn 5: bỏ 4 → còn 11, bỏ 6 → còn 5 ≤ 5 → bỏ 2 tin
        assertEquals(2, ChatHistoryTrimmer.countToDrop(history, 5, ONE_TOKEN_PER_CHAR));
    }

    @Test
    void motTinDaVuot_boHet() {
        List<ChatTurn> history = List.of(new ChatTurn("bot", "x".repeat(50)));

        assertEquals(1, ChatHistoryTrimmer.countToDrop(history, 10, ONE_TOKEN_PER_CHAR));
    }

    @Test
    void khongCoLichSu_khongBoGi() {
        assertEquals(0, ChatHistoryTrimmer.countToDrop(null, 10, ONE_TOKEN_PER_CHAR));
        assertEquals(0, ChatHistoryTrimmer.countToDrop(List.of(), 10, ONE_TOKEN_PER_CHAR));
    }

    @Test
    void demTokenThat_bangJTokkit() {
        // Bộ đếm thật của Spring AI: câu tiếng Việt ngắn cũng ra vài token, không phải 0
        int tokens = new JTokkitTokenCountEstimator().estimate("Có video nào về du lịch Đà Lạt không?");

        assertTrue(tokens > 5 && tokens < 60, "số token: " + tokens);
    }
}
