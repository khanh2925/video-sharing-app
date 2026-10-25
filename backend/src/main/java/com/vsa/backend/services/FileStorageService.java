package com.vsa.backend.services;

import com.vsa.backend.configurations.AppProperties;
import com.vsa.backend.enums.SettingKey;
import com.vsa.backend.exceptions.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Lưu file upload vào thư mục uploads/ (R8, NFR04).
 * Trả về đường dẫn tương đối dạng "/files/videos/<uuid>.mp4" để lưu vào DB;
 * app ghép thêm địa chỉ server phía trước khi hiển thị.
 *
 * Giới hạn lấy từ cấu hình, không viết cứng:
 *  - dung lượng video: SystemSetting VIDEO_MAX_SIZE_MB (quản trị viên chỉnh)
 *  - định dạng, dung lượng ảnh: application.yaml (app.upload.*)
 */
@Service
public class FileStorageService {

    public static final String VIDEO_DIR = "videos";
    public static final String THUMBNAIL_DIR = "thumbnails";
    public static final String AVATAR_DIR = "avatars";
    public static final String STORY_DIR = "stories";
    public static final String PRODUCT_DIR = "products";

    private final Path rootDir;
    private final AppProperties.UploadSettings uploadSettings;
    private final SystemSettingService systemSettingService;

    public FileStorageService(AppProperties appProperties, SystemSettingService systemSettingService) throws IOException {
        this.rootDir = Path.of(appProperties.uploadDir()).toAbsolutePath().normalize();
        this.uploadSettings = appProperties.upload();
        this.systemSettingService = systemSettingService;
        Files.createDirectories(rootDir);
    }

    /** Video bài đăng. */
    public String saveVideo(MultipartFile file) {
        return save(file, VIDEO_DIR, uploadSettings.videoTypes(), videoMaxSizeMb());
    }

    /** Ảnh (bìa, đại diện, sản phẩm). Vd saveImage(file, FileStorageService.AVATAR_DIR) */
    public String saveImage(MultipartFile file, String subDir) {
        return save(file, subDir, uploadSettings.imageTypes(), uploadSettings.imageMaxSizeMb());
    }

    /**
     * File của story: ảnh hoặc video.
     * Độ dài video (STORY_MAX_DURATION_SEC) kiểm tra ở app trước khi gửi, app lấy giới hạn qua GET /api/settings.
     */
    public String saveStoryFile(MultipartFile file) {
        if (isVideo(file)) {
            return save(file, STORY_DIR, uploadSettings.videoTypes(), videoMaxSizeMb());
        }
        return save(file, STORY_DIR, uploadSettings.imageTypes(), uploadSettings.imageMaxSizeMb());
    }

    public boolean isVideo(MultipartFile file) {
        return uploadSettings.videoTypes().contains(getExtension(file));
    }

    /** Chép một file có sẵn trên máy (dùng cho DataSeeder) vào uploads/. */
    public String copyExistingFile(Path source, String subDir) {
        try (InputStream in = Files.newInputStream(source)) {
            return write(in, subDir, source.getFileName().toString());
        } catch (IOException e) {
            throw new IllegalStateException("Không chép được file " + source, e);
        }
    }

    /** Xoá file theo đường dẫn đã lưu trong DB ("/files/..."). Không có file thì bỏ qua. */
    public void delete(String url) {
        if (url == null || !url.startsWith("/files/")) {
            return;
        }
        Path file = rootDir.resolve(url.substring("/files/".length())).normalize();
        if (!file.startsWith(rootDir)) {
            return;   // chặn đường dẫn kiểu ../../ thoát ra ngoài thư mục uploads
        }
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // xoá file không được thì thôi, không làm hỏng thao tác chính
        }
    }

    private int videoMaxSizeMb() {
        return systemSettingService.getInt(SettingKey.VIDEO_MAX_SIZE_MB);
    }

    private String save(MultipartFile file, String subDir, List<String> allowedTypes, int maxSizeMb) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Chưa chọn file");
        }
        String extension = getExtension(file);
        if (!allowedTypes.contains(extension)) {
            throw ApiException.badRequest("Chỉ nhận file " + String.join(", ", allowedTypes));
        }
        if (file.getSize() > (long) maxSizeMb * 1024 * 1024) {
            throw ApiException.badRequest("File quá lớn, tối đa " + maxSizeMb + " MB");
        }
        try (InputStream in = file.getInputStream()) {
            return write(in, subDir, UUID.randomUUID() + "." + extension);
        } catch (IOException e) {
            throw new IllegalStateException("Không lưu được file", e);
        }
    }

    private String write(InputStream in, String subDir, String fileName) throws IOException {
        Path dir = rootDir.resolve(subDir);
        Files.createDirectories(dir);
        Files.copy(in, dir.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
        return "/files/" + subDir + "/" + fileName;
    }

    private static String getExtension(MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name == null || !name.contains(".")) {
            return "";
        }
        return name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
