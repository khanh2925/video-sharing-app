package com.vsa.backend.mappers;

import com.vsa.backend.dtos.response.StoryResponse;
import com.vsa.backend.entities.Story;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Chuyển Story sang StoryResponse. */
@Component
@RequiredArgsConstructor
public class StoryMapper {

    private final CatalogMapper catalogMapper;

    public StoryResponse toResponse(Story story, boolean viewed) {
        return new StoryResponse(
                story.getId(),
                story.getMediaUrl(),
                story.getMediaType(),
                story.getDurationSec(),
                story.getCreatedAt(),
                story.getExpiresAt(),
                viewed,
                story.getAudio() == null ? null : catalogMapper.toAudioResponse(story.getAudio()));
    }
}
