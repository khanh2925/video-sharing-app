package com.vsa.backend.ai.recommend;

import com.vsa.backend.entities.Hashtag;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.enums.Visibility;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Đưa video vào kho vector (UC Gợi ý video) — Khánh.
 * Chưa bật AI (không chạy profile "ai") thì mọi hàm ở đây không làm gì.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VideoEmbeddingService {

    private final ObjectProvider<VectorStore> vectorStoreProvider;

    /** Lưu (hoặc cập nhật) vector của video. Video không công khai hay chưa đăng thì xoá vector đi. */
    public void index(Video video) {
        VectorStore store = vectorStoreProvider.getIfAvailable();
        if (store == null) {
            return;
        }
        if (video.getStatus() != VideoStatus.PUBLISHED || video.getVisibility() != Visibility.PUBLIC) {
            remove(video.getId());
            return;
        }
        try {
            store.add(List.of(toDocument(video)));
        } catch (RuntimeException e) {
            // Gemini lỗi (hết lượt, mất mạng) thì chỉ ghi log, KHÔNG làm hỏng việc đăng video
            log.warn("Không tạo được vector cho video {}: {}", video.getId(), e.getMessage());
        }
    }

    public void remove(Long videoId) {
        VectorStore store = vectorStoreProvider.getIfAvailable();
        if (store == null) {
            return;
        }
        try {
            store.delete(List.of(documentId(videoId)));
        } catch (RuntimeException e) {
            log.warn("Không xoá được vector của video {}: {}", videoId, e.getMessage());
        }
    }

    /** Mỗi video luôn ra cùng một id → đăng lại hay sửa thì ghi đè, không bị trùng. */
    public static String documentId(Long videoId) {
        return UUID.nameUUIDFromBytes(("video-" + videoId).getBytes(StandardCharsets.UTF_8)).toString();
    }

    /** Đoạn chữ mô tả video. Gemini đọc đoạn này để tạo vector, nên càng đủ ý gợi ý càng đúng. */
    public static String contentOf(Video video) {
        List<String> parts = new ArrayList<>();
        parts.add(video.getTitle());
        if (video.getTopic() != null) {
            parts.add("Chủ đề: " + video.getTopic().getName());
        }
        if (video.getDescription() != null) {
            parts.add(video.getDescription());
        }
        if (!video.getHashtags().isEmpty()) {
            parts.add(video.getHashtags().stream()
                    .map(Hashtag::getName)
                    .map(name -> "#" + name)
                    .collect(Collectors.joining(" ")));
        }
        return String.join("\n", parts);
    }

    private Document toDocument(Video video) {
        return Document.builder()
                .id(documentId(video.getId()))
                .text(contentOf(video))
                .metadata(Map.of(
                        "videoId", video.getId(),
                        "ownerId", video.getOwner().getId()))
                .build();
    }
}
