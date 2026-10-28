package com.vsa.backend.controllers;

import com.vsa.backend.dtos.response.SearchResponse;
import com.vsa.backend.services.SearchService;
import com.vsa.backend.utils.PageUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public SearchResponse search(@RequestParam(defaultValue = "") String q,
                                 @RequestParam(defaultValue = "videos") String type,
                                 @RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "20") int size) {
        return searchService.search(q, type, PageUtils.of(page, size));
    }

    @GetMapping("/suggestions")
    public List<String> suggestions(@RequestParam(defaultValue = "") String q) {
        return searchService.suggestions(q);
    }
}
