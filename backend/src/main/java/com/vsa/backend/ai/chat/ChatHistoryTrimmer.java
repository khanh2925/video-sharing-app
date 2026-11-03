package com.vsa.backend.ai.chat;

import org.springframework.ai.tokenizer.TokenCountEstimator;

import java.util.List;

/**
 * Giới hạn lịch sử chat theo token: tổng token của các tin gửi kèm không vượt maxTokens.
 * Vượt thì bỏ dần tin CŨ NHẤT cho tới khi vừa, để có chỗ cho nội dung mới.
 * Token đếm bằng TokenCountEstimator của Spring AI (JTokkit) – gần đúng cách model tính tiền.
 */
public final class ChatHistoryTrimmer {

    private ChatHistoryTrimmer() {
    }

    /** Số tin cũ nhất phải bỏ (0 = giữ hết). */
    public static int countToDrop(List<ChatTurn> history, int maxTokens, TokenCountEstimator estimator) {
        if (history == null || history.isEmpty()) {
            return 0;
        }
        int[] tokens = new int[history.size()];
        int total = 0;
        for (int i = 0; i < history.size(); i++) {
            tokens[i] = estimator.estimate(history.get(i).text());
            total += tokens[i];
        }
        int drop = 0;
        while (drop < history.size() && total > maxTokens) {
            total -= tokens[drop];
            drop++;
        }
        return drop;
    }
}
