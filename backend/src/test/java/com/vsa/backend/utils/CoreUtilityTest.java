package com.vsa.backend.utils;

import com.vsa.backend.configurations.AppProperties;
import com.vsa.backend.dtos.response.PageResponse;
import com.vsa.backend.exceptions.ApiException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CoreUtilityTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void appProperties_exposesNestedConfigurationValues() {
        AppProperties properties = new AppProperties(
                "uploads",
                "seed-media",
                new AppProperties.JwtSettings("secret", 7),
                new AppProperties.UploadSettings(List.of("mp4"), List.of("jpg", "png"), 5),
                new AppProperties.PagingSettings(20, 10, 8));

        assertEquals("uploads", properties.uploadDir());
        assertEquals("seed-media", properties.seedMediaDir());
        assertEquals("secret", properties.jwt().secret());
        assertEquals(7, properties.jwt().expirationDays());
        assertEquals(List.of("mp4"), properties.upload().videoTypes());
        assertEquals(List.of("jpg", "png"), properties.upload().imageTypes());
        assertEquals(5, properties.upload().imageMaxSizeMb());
        assertEquals(20, properties.paging().commentPageSize());
        assertEquals(10, properties.paging().trendingSize());
        assertEquals(8, properties.paging().suggestionSize());
    }

    @Test
    void pageResponse_mapsContentAndPaginationMetadata() {
        PageImpl<Integer> source = new PageImpl<>(List.of(3, 4), PageRequest.of(1, 2), 5);

        PageResponse<String> response = PageResponse.of(source, value -> "item-" + value);

        assertEquals(List.of("item-3", "item-4"), response.content());
        assertEquals(1, response.page());
        assertEquals(2, response.size());
        assertEquals(5, response.totalElements());
        assertEquals(3, response.totalPages());
        assertFalse(response.last());
    }

    @Test
    void apiExceptionFactories_preserveStatusAndMessage() {
        List<ApiException> exceptions = List.of(
                ApiException.notFound("not found"),
                ApiException.badRequest("bad request"),
                ApiException.unauthorized("unauthorized"),
                ApiException.forbidden("forbidden"),
                ApiException.conflict("conflict"));

        assertEquals(List.of(
                        HttpStatus.NOT_FOUND,
                        HttpStatus.BAD_REQUEST,
                        HttpStatus.UNAUTHORIZED,
                        HttpStatus.FORBIDDEN,
                        HttpStatus.CONFLICT),
                exceptions.stream().map(exception -> exception.getStatus()).toList());
        assertEquals(List.of("not found", "bad request", "unauthorized", "forbidden", "conflict"),
                exceptions.stream().map(exception -> exception.getMessage()).toList());
    }

    @Test
    void securityUtils_returnsAuthenticatedUserAndAdminRole() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        42L,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));

        assertEquals(42L, SecurityUtils.getCurrentUserId());
        assertEquals(42L, SecurityUtils.getCurrentUserIdOrNull());
        assertTrue(SecurityUtils.isAdmin());
    }

    @Test
    void securityUtils_handlesAnonymousAndNonAdminUsers() {
        assertNull(SecurityUtils.getCurrentUserIdOrNull());
        ApiException exception = assertThrows(ApiException.class, SecurityUtils::getCurrentUserId);
        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertFalse(SecurityUtils.isAdmin());

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("anonymous", null, List.of()));
        assertNull(SecurityUtils.getCurrentUserIdOrNull());
        assertFalse(SecurityUtils.isAdmin());
    }
}
