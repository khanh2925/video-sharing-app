package com.vsa.backend.dtos.request;

import com.vsa.backend.utils.AppConstants;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu gửi lên khi đăng ký (UC01).
 * JSON: {"username": "lan2", "displayName": "Lan", "email": "lan2@gmail.com",
 *        "password": "123456", "confirmPassword": "123456"}
 * Sai annotation nào thì GlobalExceptionHandler trả 400 kèm đúng câu message của annotation đó.
 */
public record RegisterRequest(

        @NotBlank(message = "Vui lòng nhập tên đăng nhập")
        @Size(min = AppConstants.USERNAME_MIN, max = AppConstants.USERNAME_MAX,
                message = "Tên đăng nhập từ " + AppConstants.USERNAME_MIN + " đến " + AppConstants.USERNAME_MAX + " ký tự")
        @Pattern(regexp = AppConstants.USERNAME_PATTERN,
                message = "Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới")
        String username,

        @NotBlank(message = "Vui lòng nhập tên hiển thị")
        @Size(max = AppConstants.DISPLAY_NAME_MAX,
                message = "Tên hiển thị tối đa " + AppConstants.DISPLAY_NAME_MAX + " ký tự")
        String displayName,

        @NotBlank(message = "Vui lòng nhập email")
        @Email(message = "Email không hợp lệ")
        @Size(max = AppConstants.EMAIL_MAX, message = "Email tối đa " + AppConstants.EMAIL_MAX + " ký tự")
        String email,

        @NotBlank(message = "Vui lòng nhập mật khẩu")
        @Size(min = AppConstants.PASSWORD_MIN, max = AppConstants.PASSWORD_MAX,
                message = "Mật khẩu từ " + AppConstants.PASSWORD_MIN + " đến " + AppConstants.PASSWORD_MAX + " ký tự")
        String password,

        @NotBlank(message = "Vui lòng nhập lại mật khẩu")
        String confirmPassword
) {
}
