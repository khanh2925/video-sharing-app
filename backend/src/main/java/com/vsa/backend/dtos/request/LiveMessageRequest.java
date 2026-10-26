package com.vsa.backend.dtos.request;

import com.vsa.backend.utils.AppConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LiveMessageRequest(
        @NotBlank(message = "Nội dung không được để trống")
        @Size(max = AppConstants.LIVE_MESSAGE_MAX,
                message = "Nội dung tối đa " + AppConstants.LIVE_MESSAGE_MAX + " ký tự")
        String content
) {
}
