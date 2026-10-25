package com.vsa.backend.entities;

import com.vsa.backend.enums.SettingKey;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/** Một thông số hệ thống do quản trị viên chỉnh (UC19). Khoá chính là tên thông số. */
@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSetting {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private SettingKey settingKey;

    @Column(nullable = false, length = 100)
    private String settingValue;

    @Column(length = 200)
    private String description;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
