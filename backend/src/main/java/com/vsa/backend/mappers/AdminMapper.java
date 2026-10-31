package com.vsa.backend.mappers;

import com.vsa.backend.dtos.response.AdminUserResponse;
import com.vsa.backend.dtos.response.SettingResponse;
import com.vsa.backend.entities.SystemSetting;
import com.vsa.backend.entities.User;
import org.springframework.stereotype.Component;

/** Chuyển entity sang DTO cho API quản trị (UC16, UC19). */
@Component
public class AdminMapper {

    public AdminUserResponse toAdminUserResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmail(),
                user.getRole(),
                user.isLocked(),
                user.getCreatedAt());
    }

    public SettingResponse toSettingResponse(SystemSetting setting) {
        return new SettingResponse(
                setting.getSettingKey(),
                setting.getSettingValue(),
                setting.getDescription(),
                setting.getUpdatedAt());
    }
}
