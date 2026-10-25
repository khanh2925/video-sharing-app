package com.vsa.backend.dtos.request;

import com.vsa.backend.enums.Visibility;
import com.vsa.backend.utils.AppConstants;
import jakarta.validation.constraints.Size;

/**
 * Sửa video của mình (UC10). Chỉ gửi trường nào muốn đổi, trường null giữ nguyên.
 * JSON: {"title": "Tiêu đề mới", "visibility": "FOLLOWERS", "allowComments": false}
 * Đăng bản nháp ("Đăng ngay"): {"publish": true}
 */
public record UpdateVideoRequest(

        @Size(max = AppConstants.VIDEO_TITLE_MAX,
                message = "Tiêu đề tối đa " + AppConstants.VIDEO_TITLE_MAX + " ký tự")
        String title,

        @Size(max = AppConstants.VIDEO_DESCRIPTION_MAX,
                message = "Mô tả tối đa " + AppConstants.VIDEO_DESCRIPTION_MAX + " ký tự")
        String description,

        Visibility visibility,

        Boolean allowComments,

        // true = chuyển bản nháp DRAFT → PUBLISHED
        Boolean publish
) {
}
