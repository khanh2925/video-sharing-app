package com.vsa.backend.enums;

import lombok.Getter;

/**
 * Các thông số quản trị viên chỉnh được (UC19 – Cấu hình hệ thống), kèm giá trị mặc định.
 * Thêm thông số mới: thêm 1 dòng ở đây, backend chạy lên sẽ tự tạo dòng trong bảng system_settings.
 */
@Getter
public enum SettingKey {
    STORY_MAX_DURATION_SEC("15", "Story là video dài tối đa (giây)"),
    STORY_LIFETIME_HOURS("24", "Story tự ẩn sau (giờ)"),
    VIDEO_MAX_SIZE_MB("100", "Dung lượng video tối đa (MB)");

    private final String defaultValue;
    private final String description;

    SettingKey(String defaultValue, String description) {
        this.defaultValue = defaultValue;
        this.description = description;
    }
}
