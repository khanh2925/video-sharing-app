package com.vsa.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CreateLiveRequest(
        @NotBlank(message = "Vui lòng nhập tiêu đề livestream")
        @Size(max = 150, message = "Tiêu đề livestream tối đa 150 ký tự")
        String title,

        @NotNull(message = "Vui lòng chọn video nguồn")
        Long sourceVideoId,

        @Size(max = 150, message = "Tên sản phẩm tối đa 150 ký tự")
        String productName,

        @PositiveOrZero(message = "Giá sản phẩm không được âm")
        Double productPrice,

        @Size(max = 255, message = "Đường dẫn ảnh sản phẩm tối đa 255 ký tự")
        String productImageUrl
) {
}
