package com.vsa.backend.mappers;

import com.vsa.backend.dtos.response.AudioResponse;
import com.vsa.backend.dtos.response.AuthUserResponse;
import com.vsa.backend.dtos.response.StoryResponse;
import com.vsa.backend.dtos.response.TopicResponse;
import com.vsa.backend.dtos.response.UserSummaryResponse;
import com.vsa.backend.entities.Audio;
import com.vsa.backend.entities.Story;
import com.vsa.backend.entities.Topic;
import com.vsa.backend.entities.User;
import com.vsa.backend.enums.MediaType;
import com.vsa.backend.enums.Role;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class MapperTest {

    private final UserMapper userMapper = new UserMapper();
    private final CatalogMapper catalogMapper = new CatalogMapper();
    private final StoryMapper storyMapper = new StoryMapper();

    @Test
    void userMapper_mapsPrivateAndSummaryViewsWithoutPassword() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 1, 2, 3, 4);
        User user = User.builder()
                .id(7L)
                .username("lan")
                .email("lan@example.com")
                .passwordHash("never-return-this")
                .displayName("Lan")
                .bio("bio")
                .avatarUrl("/lan.png")
                .role(Role.ADMIN)
                .createdAt(createdAt)
                .build();

        AuthUserResponse auth = userMapper.toAuthUserResponse(user);
        UserSummaryResponse summary = userMapper.toSummary(user);

        assertAll(
                () -> assertEquals(7L, auth.id()),
                () -> assertEquals("lan", auth.username()),
                () -> assertEquals("Lan", auth.displayName()),
                () -> assertEquals("lan@example.com", auth.email()),
                () -> assertEquals("bio", auth.bio()),
                () -> assertEquals("/lan.png", auth.avatarUrl()),
                () -> assertEquals(Role.ADMIN, auth.role()),
                () -> assertEquals(createdAt, auth.createdAt()));
        assertEquals(new UserSummaryResponse(7L, "lan", "Lan", "/lan.png"), summary);
        assertFalse(auth.toString().contains("never-return-this"));
    }

    @Test
    void catalogMapper_mapsTopicAndAudio() {
        Topic topic = Topic.builder().id(3L).name("Travel").icon("plane").color("#123456").build();
        Audio audio = Audio.builder()
                .id(4L)
                .title("Song")
                .artist("Artist")
                .coverUrl("/cover.jpg")
                .durationSec(125)
                .trending(true)
                .build();

        TopicResponse topicResponse = catalogMapper.toTopicResponse(topic);
        AudioResponse audioResponse = catalogMapper.toAudioResponse(audio);

        assertEquals(new TopicResponse(3L, "Travel", "plane", "#123456"), topicResponse);
        assertEquals(new AudioResponse(4L, "Song", "Artist", "/cover.jpg", 125, true), audioResponse);
    }

    @Test
    void storyMapper_mapsLifecycleAndViewedFlag() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 5, 1, 10, 0);
        LocalDateTime expiresAt = createdAt.plusHours(24);
        Story story = Story.builder()
                .id(9L)
                .mediaUrl("/story.mp4")
                .mediaType(MediaType.VIDEO)
                .durationSec(12)
                .createdAt(createdAt)
                .expiresAt(expiresAt)
                .build();

        StoryResponse response = storyMapper.toResponse(story, true);

        assertEquals(new StoryResponse(9L, "/story.mp4", MediaType.VIDEO, 12,
                createdAt, expiresAt, true), response);
    }
}
