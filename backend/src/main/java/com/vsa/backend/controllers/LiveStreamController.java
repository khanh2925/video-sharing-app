package com.vsa.backend.controllers;

import com.vsa.backend.dtos.request.CreateLiveRequest;
import com.vsa.backend.dtos.response.LiveMessageResponse;
import com.vsa.backend.dtos.response.LiveStreamResponse;
import com.vsa.backend.services.LiveStreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lives")
@RequiredArgsConstructor
public class LiveStreamController {

    private final LiveStreamService liveStreamService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LiveStreamResponse create(@Valid @RequestBody CreateLiveRequest request) {
        return liveStreamService.create(request);
    }

    @PostMapping("/{id}/end")
    public LiveStreamResponse end(@PathVariable Long id) {
        return liveStreamService.end(id);
    }

    @GetMapping
    public List<LiveStreamResponse> getActive() {
        return liveStreamService.getActive();
    }

    @GetMapping("/{id}")
    public LiveStreamResponse getById(@PathVariable Long id) {
        return liveStreamService.getById(id);
    }

    @GetMapping("/{id}/messages")
    public List<LiveMessageResponse> getMessages(@PathVariable Long id) {
        return liveStreamService.getMessages(id);
    }
}
