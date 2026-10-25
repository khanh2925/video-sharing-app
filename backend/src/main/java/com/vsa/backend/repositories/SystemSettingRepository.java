package com.vsa.backend.repositories;

import com.vsa.backend.entities.SystemSetting;
import com.vsa.backend.enums.SettingKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// Thông số hệ thống. Khoá chính là SettingKey (không phải Long như các bảng khác).
@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, SettingKey> {
}
