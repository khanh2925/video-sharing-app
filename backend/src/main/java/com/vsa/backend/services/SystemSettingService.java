package com.vsa.backend.services;

import com.vsa.backend.entities.SystemSetting;
import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.exceptions.ApiException;
import com.vsa.backend.repositories.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Đọc / sửa thông số hệ thống (UC19). Giá trị được giữ sẵn trong bộ nhớ nên đọc rất nhanh;
 * quản trị viên sửa thì cập nhật luôn bộ nhớ, không cần khởi động lại backend.
 *
 * Dùng trong service khác:  int maxSec = systemSettingService.getInt(SettingKey.STORY_MAX_DURATION_SEC);
 */
@Slf4j
@Service
@Order(0)   // chạy trước DataSeeder để bảng system_settings luôn có đủ dòng
@RequiredArgsConstructor
public class SystemSettingService implements CommandLineRunner {

    private final SystemSettingRepository systemSettingRepository;

    private final Map<SettingKey, String> cache = new EnumMap<>(SettingKey.class);

    /** Khi backend khởi động: thông số nào chưa có trong DB thì tạo với giá trị mặc định. */
    @Override
    @Transactional
    public void run(String... args) {
        for (SettingKey key : SettingKey.values()) {
            SystemSetting setting = systemSettingRepository.findById(key)
                    .orElseGet(() -> systemSettingRepository.save(SystemSetting.builder()
                            .settingKey(key)
                            .settingValue(key.getDefaultValue())
                            .description(key.getDescription())
                            .build()));
            cache.put(key, setting.getSettingValue());
        }
        log.info("Thông số hệ thống: {}", cache);
    }

    public int getInt(SettingKey key) {
        String value = cache.getOrDefault(key, key.getDefaultValue());
        return Integer.parseInt(value);
    }

    public List<SystemSetting> getAll() {
        return systemSettingRepository.findAll();
    }

    /** Quản trị viên đổi giá trị. Hiện các thông số đều là số nguyên dương. */
    @Transactional
    public SystemSetting update(SettingKey key, String newValue) {
        int number;
        try {
            number = Integer.parseInt(newValue.trim());
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("Giá trị phải là số nguyên");
        }
        if (number <= 0) {
            throw ApiException.badRequest("Giá trị phải lớn hơn 0");
        }

        SystemSetting setting = systemSettingRepository.findById(key)
                .orElseThrow(() -> ApiException.notFound("Không có thông số " + key));
        setting.setSettingValue(String.valueOf(number));
        cache.put(key, setting.getSettingValue());
        return setting;
    }
}
