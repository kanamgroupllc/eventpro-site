package com.accessplus.eventpro.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory per-IP rate limit for public/sensitive endpoints to reduce DDoS and abuse.
 * Applies to configured POST paths (auth, payments) and heavy admin GET paths (audit, system status).
 * Admin GET limits are higher than auth POSTs; tune via {@code eventpro.rate-limit.admin-get-requests-per-minute}.
 * For multiple instances, use Redis-backed rate limiting (e.g. Bucket4j) instead.
 */
@Slf4j
@Component
@Order(-1) // Run before JWT filter
public class RateLimitFilter extends OncePerRequestFilter {

    @Value("${eventpro.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${eventpro.rate-limit.requests-per-minute:60}")
    private int requestsPerMinute;

    /** Higher cap for authenticated admin polling (audit feed, health) to avoid UI thrash while still bounding abuse. */
    @Value("${eventpro.rate-limit.admin-get-requests-per-minute:300}")
    private int adminGetRequestsPerMinute;

    @Value("${eventpro.rate-limit.window-seconds:60}")
    private int windowSeconds;

    private final Map<String, RequestWindow> perKey = new ConcurrentHashMap<>();
    private static final int CLEANUP_INTERVAL = 200;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!enabled) return true;
        String path = request.getRequestURI();
        String method = request.getMethod();
        return !isRateLimitedPath(path, method);
    }

    private boolean isRateLimitedPath(String path, String method) {
        if (HttpMethod.POST.name().equals(method)) {
            return path.equals("/api/v1/auth/login")
                    || path.equals("/api/v1/auth/signup")
                    || path.equals("/api/v1/auth/send-reset-email")
                    || path.equals("/api/v1/payments/guest-reserve")
                    || path.equals("/api/v1/payments/create-intent");
        }
        if (HttpMethod.GET.name().equals(method)) {
            return "/api/v1/admin/audit-activity".equals(path)
                    || "/api/v1/admin/system-status".equals(path);
        }
        return false;
    }

    private String rateLimitKey(HttpServletRequest request) {
        String ip = clientKey(request);
        String path = request.getRequestURI();
        if (HttpMethod.GET.name().equals(request.getMethod())
                && ("/api/v1/admin/audit-activity".equals(path) || "/api/v1/admin/system-status".equals(path))) {
            return ip + ":admin";
        }
        return ip + ":auth";
    }

    private int maxRequestsFor(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (HttpMethod.GET.name().equals(request.getMethod())
                && ("/api/v1/admin/audit-activity".equals(path) || "/api/v1/admin/system-status".equals(path))) {
            return adminGetRequestsPerMinute;
        }
        return requestsPerMinute;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String key = rateLimitKey(request);
        int max = maxRequestsFor(request);
        RequestWindow window = perKey.computeIfAbsent(key, k -> new RequestWindow(max));

        if (!window.allow()) {
            log.warn("Rate limit exceeded: key={}", maskKey(key));
            response.setStatus(429); // Too Many Requests (SC_TOO_MANY_REQUESTS in Servlet 4+)
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Try again later.\"}");
            return;
        }

        if (perKey.size() % CLEANUP_INTERVAL == 0) {
            cleanup();
        }
        filterChain.doFilter(request, response);
    }

    private String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isEmpty()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private static String maskKey(String key) {
        if (key == null || key.length() < 8) return "***";
        return key.substring(0, Math.min(4, key.length())) + "***";
    }

    private void cleanup() {
        long cutoff = Instant.now().getEpochSecond() - (2L * windowSeconds);
        perKey.entrySet().removeIf(e -> e.getValue().lastAccessSeconds < cutoff);
    }

    private class RequestWindow {
        private final int configuredMax;
        private long windowStartSeconds = Instant.now().getEpochSecond();
        private int count;
        private long lastAccessSeconds = Instant.now().getEpochSecond();

        RequestWindow(int configuredMax) {
            this.configuredMax = configuredMax;
        }

        synchronized boolean allow() {
            long now = Instant.now().getEpochSecond();
            lastAccessSeconds = now;
            if (now - windowStartSeconds >= windowSeconds) {
                windowStartSeconds = now;
                count = 0;
            }
            if (count >= configuredMax) {
                return false;
            }
            count++;
            return true;
        }
    }
}
