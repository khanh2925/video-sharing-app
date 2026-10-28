package com.vsa.backend.dtos.request;

import com.vsa.backend.utils.AppConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentCreateRequest(
        @NotBlank(message = "Bình luận không được để trống")
        @Size(max = AppConstants.COMMENT_MAX,
                message = "Bình luận tối đa " + AppConstants.COMMENT_MAX + " ký tự")
        String content
) {
}
