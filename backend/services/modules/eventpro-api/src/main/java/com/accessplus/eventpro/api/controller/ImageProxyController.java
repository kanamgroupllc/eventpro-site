package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.event.service.AWSS3ImageService;
import com.accessplus.eventpro.event.service.ImageAccessDeniedException;
import com.accessplus.eventpro.event.service.S3ObjectContent;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
@Tag(name = "Images", description = "Image proxy for S3 objects")
public class ImageProxyController extends BaseController {

    private final AWSS3ImageService s3ImageService;

    @GetMapping("/proxy")
    @Operation(summary = "Proxy S3 image", description = "Streams an image from S3 by key or full URL. Use when direct S3 URL returns 403 (e.g. LocalStack).")
    public ResponseEntity<byte[]> proxyImage(
            @RequestParam(required = false) String key,
            @RequestParam(required = false) String url) {
        String keyOrUrl = key != null && !key.isBlank() ? key : url;
        if (keyOrUrl == null || keyOrUrl.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            String decoded = URLDecoder.decode(keyOrUrl.trim(), StandardCharsets.UTF_8);
            // Strip query string so it's not part of the S3 key
            int q = decoded.indexOf('?');
            if (q > 0) {
                decoded = decoded.substring(0, q);
            }
            // Only allow keys that look like our event/profile paths (security)
            if (!isAllowedKeyOrUrl(decoded)) {
                log.warn("Image proxy rejected disallowed key/url: {}", decoded);
                return ResponseEntity.status(403).build();
            }
            log.debug("Image proxy fetching: url={}", decoded);
            S3ObjectContent content = s3ImageService.getObject(decoded);
            log.debug("Image proxy served: url={}", decoded);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(content.getContentType()));
            headers.setCacheControl("public, max-age=3600");
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(content.getContent());
        } catch (ImageAccessDeniedException e) {
            log.warn("Image proxy access denied for url={}: {}", keyOrUrl, e.getMessage());
            return ResponseEntity.status(403).build();
        } catch (IOException e) {
            log.warn("Image proxy failed for url={}: {} (cause: {})", keyOrUrl, e.getMessage(),
                    e.getCause() != null ? e.getCause().getMessage() : "none");
            return ResponseEntity.notFound().build();
        }
    }

    private static boolean isAllowedKeyOrUrl(String keyOrUrl) {
        String normalized = keyOrUrl;
        // If it's a URL, accept if it contains our allowed path prefixes
        if (normalized.contains("events/") || normalized.contains("profile-pictures/")) {
            return true;
        }
        return normalized.startsWith("events/") || normalized.startsWith("profile-pictures/");
    }
}
