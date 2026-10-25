package com.vsa.backend.configurations;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Cấu hình kỹ thuật của ứng dụng, đọc từ phần "app:" trong application.yaml.
 * Đổi giá trị → sửa application.yaml rồi chạy lại backend, không phải sửa code.
 * Dùng: tiêm AppProperties vào rồi gọi, vd appProperties.comment().pageSize()
 *
 * (Thông số quản trị viên chỉnh trên app → SystemSettingService;
 *  giới hạn gắn với cột DB → AppConstants.)
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String uploadDir,
        String seedMediaDir,
        JwtSettings jwt,
        UploadSettings upload,
        PagingSettings paging) {

    public record JwtSettings(String secret, int expirationDays) {
    }

    public record UploadSettings(List<String> videoTypes, List<String> imageTypes, int imageMaxSizeMb) {
    }

    public record PagingSettings(int commentPageSize, int trendingSize, int suggestionSize) {
    }
}
