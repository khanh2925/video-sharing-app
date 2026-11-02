package com.vsa.backend.utils;

/**
 * Các giới hạn gần như không bao giờ đổi, gắn với độ dài cột trong DB.
 * Gom về một chỗ để KHÔNG rải số 30, 150, 500... khắp code. Cần đổi thì sửa ở đây.
 * Dùng được trong annotation, vd: @Size(max = AppConstants.COMMENT_MAX)
 *
 * (Giới hạn hay đổi như độ dài story, dung lượng video → admin chỉnh trong SystemSetting;
 *  giới hạn kỹ thuật như số mục mỗi trang → application.yaml, lớp AppProperties.)
 */
public final class AppConstants {

    private AppConstants() {
    }

    // Tài khoản
    public static final int USERNAME_MIN = 3;
    public static final int USERNAME_MAX = 30;
    public static final int PASSWORD_MIN = 6;
    public static final int PASSWORD_MAX = 72;          // BCrypt chỉ dùng 72 byte đầu
    public static final int EMAIL_MAX = 100;
    public static final String USERNAME_PATTERN = "^[a-zA-Z0-9._]+$";   // chữ không dấu, số, dấu chấm, gạch dưới
    public static final int DISPLAY_NAME_MAX = 50;
    public static final int BIO_MAX = 200;

    // Video
    public static final int VIDEO_TITLE_MAX = 150;
    public static final int VIDEO_DESCRIPTION_MAX = 2000;
    public static final int VIDEO_FILTER_MAX = 30;      // tên bộ lọc màu
    public static final int HASHTAG_MAX = 50;           // độ dài một hashtag

    // Bình luận, live
    public static final int COMMENT_MAX = 500;
    public static final int LIVE_MESSAGE_MAX = 300;
    public static final int LIVE_MAX_ACTIVE_PER_USER = 1;

    // Thông báo, chia sẻ (UC20)
    public static final int NOTIFICATION_TEXT_MAX = 200;   // cột notifications.text
    public static final int SHARE_MESSAGE_MAX = 150;
    public static final int SHARE_MAX_RECIPIENTS = 20;
}
