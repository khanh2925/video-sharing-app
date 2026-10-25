package com.vsa.backend.dtos.response;

import java.util.List;

/**
 * Một avatar trên hàng Stories (UC18): một người cùng các story còn hạn của họ, cũ trước mới sau.
 * allViewed = true → app vẽ viền xám, false → viền xanh.
 * mine = true → nhóm của chính mình (ô "You").
 */
public record StoryGroupResponse(
        UserSummaryResponse owner,
        boolean mine,
        boolean allViewed,
        List<StoryResponse> stories
) {
}
