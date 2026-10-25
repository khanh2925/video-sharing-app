package com.vsa.backend.mappers;

import com.vsa.backend.dtos.response.AudioResponse;
import com.vsa.backend.dtos.response.TopicResponse;
import com.vsa.backend.entities.Audio;
import com.vsa.backend.entities.Topic;
import org.springframework.stereotype.Component;

/** Chuyển danh mục chủ đề, nhạc sang DTO. */
@Component
public class CatalogMapper {

    public TopicResponse toTopicResponse(Topic topic) {
        return new TopicResponse(topic.getId(), topic.getName(), topic.getIcon(), topic.getColor());
    }

    public AudioResponse toAudioResponse(Audio audio) {
        return new AudioResponse(audio.getId(), audio.getTitle(), audio.getArtist(),
                audio.getCoverUrl(), audio.getDurationSec(), audio.isTrending());
    }
}
