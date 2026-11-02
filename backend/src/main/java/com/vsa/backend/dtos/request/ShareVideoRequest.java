package com.vsa.backend.dtos.request;

import com.vsa.backend.utils.AppConstants;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Chia sẻ video cho bạn bè: danh sách id người nhận + lời nhắn (không bắt buộc). */
public record ShareVideoRequest(
        @NotEmpty(message = "Chọn ít nhất một người để chia sẻ")
        @Size(max = AppConstants.SHARE_MAX_RECIPIENTS,
                message = "Mỗi lần chia sẻ tối đa " + AppConstants.SHARE_MAX_RECIPIENTS + " người")
        List<Long> userIds,
        @Size(max = AppConstants.SHARE_MESSAGE_MAX,
                message = "Lời nhắn tối đa " + AppConstants.SHARE_MESSAGE_MAX + " ký tự")
        String message
) {
}
