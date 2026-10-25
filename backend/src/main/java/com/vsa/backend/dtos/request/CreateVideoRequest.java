package com.vsa.backend.dtos.request;

import com.vsa.backend.enums.Visibility;
import com.vsa.backend.utils.AppConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Thông tin đi kèm khi đăng video (UC08 + UC09), gửi chung request multipart với file video.
 * Mỗi thuộc tính là một trường form-data cùng tên:
 *   file (video, bắt buộc), thumbnail (ảnh bìa, không bắt buộc),
 *   title, description, hashtags, topicId, audioId, filter, visibility, allowComments, draft
 * hashtags gửi "dulich,dalat" hoặc lặp lại trường hashtags nhiều lần; có hay không có dấu # đều được.
 * Trường nào để trống thì service dùng mặc định: visibility = PUBLIC, allowComments = true, draft = false.
 */
public record CreateVideoRequest(

        @NotBlank(message = "Vui lòng nhập tiêu đề")
        @Size(max = AppConstants.VIDEO_TITLE_MAX,
                message = "Tiêu đề tối đa " + AppConstants.VIDEO_TITLE_MAX + " ký tự")
        String title,

        @Size(max = AppConstants.VIDEO_DESCRIPTION_MAX,
                message = "Mô tả tối đa " + AppConstants.VIDEO_DESCRIPTION_MAX + " ký tự")
        String description,

        List<String> hashtags,

        Long topicId,

        // UC09: nhạc nền và bộ lọc màu chọn ở bước chỉnh sửa
        Long audioId,

        @Size(max = AppConstants.VIDEO_FILTER_MAX,
                message = "Tên bộ lọc tối đa " + AppConstants.VIDEO_FILTER_MAX + " ký tự")
        String filter,

        Visibility visibility,

        Boolean allowComments,

        // true = bấm "Save draft" → lưu bản nháp, chưa hiện cho ai xem
        Boolean draft
) {
}
