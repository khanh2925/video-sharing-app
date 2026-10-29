package com.vsa.backend.configurations;

import com.vsa.backend.entities.*;
import com.vsa.backend.enums.*;
import com.vsa.backend.repositories.*;
import com.vsa.backend.services.FileStorageService;
import com.vsa.backend.services.SystemSettingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Stream;

/**
 * Nạp dữ liệu mẫu khi backend chạy mà bảng users còn trống.
 * Cả nhóm git pull về là có cùng một bộ dữ liệu để test.
 *
 * Tài khoản mẫu (mật khẩu đều là 123456):
 *   admin (ADMIN), lan, minh, hoa, an (USER)
 *
 * Video lấy từ thư mục seed-media/videos, nhạc từ seed-media/audios (xem seed-media/README.md).
 * Muốn nạp lại từ đầu: xoá database rồi chạy lại backend.
 * Chỉ Khánh sửa file này; ai cần thêm dữ liệu mẫu thì báo nhóm trưởng.
 */
@Slf4j
@Component
@Order(1)   // chạy sau SystemSettingService
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String SAMPLE_PASSWORD = "123456";

    private final UserRepository userRepository;
    private final TopicRepository topicRepository;
    private final AudioRepository audioRepository;
    private final HashtagRepository hashtagRepository;
    private final VideoRepository videoRepository;
    private final VideoLikeRepository videoLikeRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;
    private final StoryRepository storyRepository;
    private final LiveStreamRepository liveStreamRepository;
    private final LiveMessageRepository liveMessageRepository;
    private final FileStorageService fileStorageService;
    private final SystemSettingService systemSettingService;
    private final AppProperties appProperties;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Đã có dữ liệu, bỏ qua DataSeeder");
            attachAudioFiles();   // DB tạo trước khi có file nhạc thì bổ sung, không cần xoá DB
            return;
        }
        log.info("Database trống, bắt đầu nạp dữ liệu mẫu...");

        // ---------- Người dùng ----------
        User admin = createUser("admin", "Quản trị viên", "Tài khoản kiểm duyệt nội dung", Role.ADMIN);
        User lan = createUser("lan", "Lan Nguyễn", "Mê du lịch và mèo 🐱", Role.USER);
        User minh = createUser("minh", "Minh Trần", "Nhà sáng tạo nội dung", Role.USER);
        User hoa = createUser("hoa", "Shop Hoa", "Livestream bán hàng tối thứ 7", Role.USER);
        User an = createUser("an", "An Phạm", "Thích thể thao và podcast", Role.USER);
        List<User> owners = List.of(minh, lan, hoa, minh, an, lan, minh, hoa);

        // ---------- Danh mục ----------
        List<Topic> topics = topicRepository.saveAll(List.of(
                Topic.builder().name("Sports").icon("basketball").color("#F44B87").build(),
                Topic.builder().name("Podcasts").icon("mic").color("#8338EC").build(),
                Topic.builder().name("News").icon("newspaper").color("#E63946").build(),
                Topic.builder().name("Travel").icon("airplane").color("#3D7BF7").build(),
                Topic.builder().name("Health").icon("heart").color("#06D6A0").build(),
                Topic.builder().name("Weather").icon("cloud").color("#48CAE4").build(),
                Topic.builder().name("Art").icon("palette").color("#FFBE0B").build(),
                Topic.builder().name("Pets").icon("paw").color("#FF9F1C").build()));
        Map<String, Topic> topicByName = new HashMap<>();
        topics.forEach(t -> topicByName.put(t.getName(), t));

        List<Audio> audios = audioRepository.saveAll(List.of(
                Audio.builder().title("Chill buổi sáng").artist("Lofi VN").durationSec(30).trending(true).build(),
                Audio.builder().title("Nhịp vui").artist("Beat House").durationSec(45).trending(true).build(),
                Audio.builder().title("Mưa Sài Gòn").artist("Acoustic Band").durationSec(60).build(),
                Audio.builder().title("Năng lượng").artist("EDM Crew").durationSec(30).trending(true).build(),
                Audio.builder().title("Piano nhẹ").artist("Instrumental").durationSec(90).build()));
        attachAudioFiles();

        // ---------- Video ----------
        // {tiêu đề, mô tả, chủ đề, bộ lọc, hashtag}
        String[][] videoInfo = {
                {"Du lịch Đà Lạt", "Săn mây đồi chè Cầu Đất 🌄", "Travel", "Vintage", "dulich,dalat"},
                {"Mèo con dễ thương", "Bé mèo nhà mình lần đầu thấy gương", "Pets", "Baby", "meo,thucung"},
                {"Bóng đá chiều thứ bảy", "Pha ghi bàn đẹp nhất trận", "Sports", "Contrast", "bongda,thethao"},
                {"Podcast buổi sáng", "5 phút bắt đầu ngày mới tích cực", "Podcasts", "Natural", "podcast"},
                {"Tin nóng hôm nay", "Điểm tin nhanh 60 giây", "News", "Film", "tintuc"},
                {"Yoga 5 phút", "Bài tập giãn cơ cho dân văn phòng", "Health", "Spring", "yoga,suckhoe"},
                {"Dự báo thời tiết", "Cuối tuần Sài Gòn có mưa không?", "Weather", "Natural", "thoitiet"},
                {"Vẽ tranh màu nước", "Vẽ hoa sen trong 1 phút", "Art", "Art", "vetranh,nghethuat"}};

        List<Path> videoFiles = findSampleVideos();
        List<Video> videos = new ArrayList<>();
        for (int i = 0; i < videoFiles.size(); i++) {
            String[] info = videoInfo[i % videoInfo.length];
            Path file = videoFiles.get(i);

            Video video = Video.builder()
                    .title(info[0])
                    .description(info[1])
                    .videoUrl(fileStorageService.copyExistingFile(file, FileStorageService.VIDEO_DIR))
                    .thumbnailUrl(copyThumbnailIfExists(baseName(file), FileStorageService.THUMBNAIL_DIR))
                    .filter(info[3])
                    .topic(topicByName.get(info[2]))
                    .audio(audios.get(i % audios.size()))
                    .owner(owners.get(i % owners.size()))
                    .viewCount(1000L * (videoFiles.size() - i) + 37L * i)   // để Top trending có thứ tự
                    .hashtags(findOrCreateHashtags(info[4].split(",")))
                    .build();
            videos.add(video);
        }
        // Một video nháp và một video chỉ người theo dõi xem, để test quyền xem (bảng 6.2)
        if (videos.size() >= 3) {
            videos.get(videos.size() - 1).setStatus(VideoStatus.DRAFT);
            videos.get(videos.size() - 2).setVisibility(Visibility.FOLLOWERS);
        }
        videoRepository.saveAll(videos);

        // ---------- Theo dõi ----------
        follow(lan, minh);
        follow(lan, hoa);
        follow(minh, lan);
        follow(an, lan);
        follow(an, minh);
        follow(an, hoa);

        // ---------- Thích, bình luận ----------
        if (!videos.isEmpty()) {
            Video v0 = videos.get(0);
            like(lan, v0);
            like(hoa, v0);
            like(an, v0);
            comment(lan, v0, "Đẹp quá, cuối tuần này mình đi luôn!");
            comment(an, v0, "Quay bằng máy gì vậy bạn?");
            comment(hoa, v0, "Săn mây mấy giờ là đẹp nhất ạ?");
        }
        if (videos.size() > 1) {
            Video v1 = videos.get(1);
            like(minh, v1);
            like(an, v1);
            comment(minh, v1, "Bé mèo cute xỉu 😍");
        }
        videoRepository.saveAll(videos);   // lưu lại các bộ đếm likeCount, commentCount

        // ---------- Story – hết hạn sau STORY_LIFETIME_HOURS kể từ lúc seed ----------
        int storyLifetimeHours = systemSettingService.getInt(SettingKey.STORY_LIFETIME_HOURS);
        // Chép riêng một bản ảnh sang uploads/stories để xoá story không làm mất ảnh bìa của video
        for (int i = 0; i < Math.min(3, videos.size()); i++) {
            String image = copyThumbnailIfExists(baseName(videoFiles.get(i)), FileStorageService.STORY_DIR);
            if (image != null) {
                storyRepository.save(Story.builder()
                        .mediaUrl(image)
                        .mediaType(MediaType.IMAGE)
                        .durationSec(0)
                        .expiresAt(LocalDateTime.now().plusHours(storyLifetimeHours))
                        .owner(videos.get(i).getOwner())
                        .build());
            }
        }

        // ---------- Một phiên live đang phát của Shop Hoa ----------
        videos.stream()
                .filter(v -> v.getOwner().equals(hoa) && v.getStatus() == VideoStatus.PUBLISHED)
                .findFirst()
                .ifPresent(source -> {
                    LiveStream live = liveStreamRepository.save(LiveStream.builder()
                            .title("Xả kho áo thun cuối tuần")
                            .sourceVideoUrl(source.getVideoUrl())
                            .thumbnailUrl(source.getThumbnailUrl())
                            .productName("Áo thun basic")
                            .productPrice(199000)
                            .startedAt(LocalDateTime.now().minusMinutes(12))
                            .host(hoa)
                            .build());
                    liveMessageRepository.save(LiveMessage.builder().liveStream(live).sender(lan)
                            .type(LiveMessageType.COMMENT).content("Giá bao nhiêu shop ơi?").build());
                    liveMessageRepository.save(LiveMessage.builder().liveStream(live).sender(an)
                            .type(LiveMessageType.REACTION).content("heart").build());
                });

        log.info("Nạp xong: {} người dùng, {} video. Tài khoản mẫu: {} / lan / minh / hoa / an, mật khẩu {}",
                userRepository.count(), videos.size(), admin.getUsername(), SAMPLE_PASSWORD);
    }

    // ====================== Hàm phụ ======================

    private User createUser(String username, String displayName, String bio, Role role) {
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@vsa.local")
                .passwordHash(passwordEncoder.encode(SAMPLE_PASSWORD))
                .displayName(displayName)
                .bio(bio)
                .role(role)
                .build());
    }

    private Set<Hashtag> findOrCreateHashtags(String... names) {
        Set<Hashtag> result = new HashSet<>();
        for (String name : names) {
            result.add(hashtagRepository.findByName(name)
                    .orElseGet(() -> hashtagRepository.save(Hashtag.builder().name(name).build())));
        }
        return result;
    }

    private void follow(User follower, User following) {
        followRepository.save(Follow.builder().follower(follower).following(following).build());
    }

    private void like(User user, Video video) {
        videoLikeRepository.save(VideoLike.builder().user(user).video(video).build());
        video.setLikeCount(video.getLikeCount() + 1);
    }

    private void comment(User user, Video video, String content) {
        commentRepository.save(Comment.builder().user(user).video(video).content(content).build());
        video.setCommentCount(video.getCommentCount() + 1);
    }

    // Tên bài nhạc mẫu → file trong seed-media/audios. Ghép theo TÊN, không theo thứ tự id,
    // để DB có thêm / bớt bài (vd người dùng tự thêm) thì vẫn gắn đúng file.
    private static final Map<String, String> AUDIO_FILES = Map.of(
            "Chill buổi sáng", "audio01.mp3",
            "Nhịp vui", "audio02.mp3",
            "Mưa Sài Gòn", "audio03.mp3",
            "Năng lượng", "audio04.mp3",
            "Piano nhẹ", "audio05.mp3");

    /**
     * Gắn file nhạc seed-media/audios/audio01.mp3, audio02.mp3... cho các bài mẫu chưa có file (theo AUDIO_FILES).
     * Chạy cả khi DB đã có dữ liệu, nên ai pull code mới về cũng có nhạc mà không phải xoá DB.
     */
    private void attachAudioFiles() {
        for (Audio audio : audioRepository.findAll()) {
            String fileName = AUDIO_FILES.get(audio.getTitle());
            if (fileName == null || audio.getFileUrl() != null) {
                continue;   // không phải bài mẫu, hoặc đã có file
            }
            Path file = Path.of(appProperties.seedMediaDir(), "audios", fileName);
            if (!Files.exists(file)) {
                continue;
            }
            audio.setFileUrl(fileStorageService.copyExistingFile(file, FileStorageService.AUDIO_DIR));
            audioRepository.save(audio);
            log.info("Đã gắn file nhạc {} cho bài \"{}\"", file.getFileName(), audio.getTitle());
        }
    }

    private List<Path> findSampleVideos() {
        Path dir = Path.of(appProperties.seedMediaDir(), "videos");
        if (!Files.isDirectory(dir)) {
            log.warn("Không thấy thư mục {} – bỏ qua video mẫu", dir.toAbsolutePath());
            return List.of();
        }
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(p -> p.getFileName().toString().toLowerCase().matches(".*\\.(mp4|mov|webm)$"))
                    .sorted()
                    .toList();
        } catch (IOException e) {
            log.warn("Không đọc được thư mục video mẫu", e);
            return List.of();
        }
    }

    /** Tìm seed-media/thumbnails/<baseName>.jpg|png|webp, có thì chép sang uploads/<targetDir>. */
    private String copyThumbnailIfExists(String baseName, String targetDir) {
        for (String ext : List.of(".jpg", ".png", ".webp")) {
            Path image = Path.of(appProperties.seedMediaDir(), "thumbnails", baseName + ext);
            if (Files.exists(image)) {
                return fileStorageService.copyExistingFile(image, targetDir);
            }
        }
        return null;
    }

    private static String baseName(Path file) {
        return file.getFileName().toString().replaceFirst("\\.[^.]+$", "");
    }
}
