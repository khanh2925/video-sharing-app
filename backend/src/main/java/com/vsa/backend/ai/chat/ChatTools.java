package com.vsa.backend.ai.chat;

import com.vsa.backend.entities.SystemSetting;
import com.vsa.backend.entities.Video;
import com.vsa.backend.enums.VideoStatus;
import com.vsa.backend.repositories.VideoRepository;
import com.vsa.backend.services.SystemSettingService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.data.domain.PageRequest;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Các "công cụ" Gemini được phép tự gọi khi cần dữ liệu thật (function calling) — Long.
 * Mô tả trong @Tool là thứ Gemini đọc để quyết định lúc nào gọi hàm nào, nên viết rõ ràng.
 * Tạo mới cho mỗi câu hỏi, giữ sẵn id người đang hỏi để không lộ dữ liệu của người khác.
 */
public class ChatTools {

    private final Long userId;
    private final SystemSettingService systemSettingService;
    private final VideoRepository videoRepository;

    public ChatTools(Long userId, SystemSettingService systemSettingService, VideoRepository videoRepository) {
        this.userId = userId;
        this.systemSettingService = systemSettingService;
        this.videoRepository = videoRepository;
    }

    @Tool(description = "Lấy các quy định hiện tại của app do quản trị viên cấu hình: "
            + "story dài tối đa bao nhiêu giây, story tồn tại bao nhiêu giờ, video tối đa bao nhiêu MB. "
            + "Dùng khi người dùng hỏi về giới hạn, quy định, thời gian, dung lượng.")
    public Map<String, String> getAppRules() {
        Map<String, String> rules = new LinkedHashMap<>();
        for (SystemSetting s : systemSettingService.getAll()) {
            rules.put(s.getDescription(), s.getSettingValue());
        }
        rules.put("Video quay trong app dài tối đa (giây)", "60");
        return rules;
    }

    @Tool(description = "Lấy danh sách video ĐÃ ĐĂNG của chính người đang hỏi, kèm lượt xem, lượt thích, "
            + "số bình luận, sắp theo lượt xem giảm dần. Dùng khi người dùng hỏi về video của họ.")
    public List<Map<String, Object>> getMyVideos() {
        return videoRepository.findByOwnerIdAndStatusOrderByCreatedAtDesc(userId, VideoStatus.PUBLISHED,
                        PageRequest.of(0, 50))
                .getContent().stream()
                .sorted(Comparator.comparingLong(Video::getViewCount).reversed())
                .limit(10)
                .map(v -> Map.<String, Object>of(
                        "tieuDe", v.getTitle(),
                        "luotXem", v.getViewCount(),
                        "luotThich", v.getLikeCount(),
                        "binhLuan", v.getCommentCount()))
                .toList();
    }
}
