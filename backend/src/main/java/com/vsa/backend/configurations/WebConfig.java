package com.vsa.backend.configurations;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

/**
 * Phát file đã upload qua đường dẫn /files/**.
 * Vd file uploads/videos/abc.mp4 → GET http://<host>:8080/files/videos/abc.mp4
 * Spring tự hỗ trợ HTTP Range nên app phát video được ngay, không phải tải hết (NFR02).
 */
@Configuration
@EnableConfigurationProperties(AppProperties.class)   // bật việc đọc phần "app:" trong application.yaml
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties appProperties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(appProperties.uploadDir()).toAbsolutePath().normalize().toUri().toString();
        if (!location.endsWith("/")) {
            location += "/";   // Spring cần dấu / ở cuối để hiểu đây là thư mục
        }
        registry.addResourceHandler("/files/**").addResourceLocations(location);
    }
}
