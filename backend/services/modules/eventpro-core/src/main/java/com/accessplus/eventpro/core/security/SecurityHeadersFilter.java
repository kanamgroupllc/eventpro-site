package com.accessplus.eventpro.core.security;

import com.accessplus.eventpro.core.config.EventProSecurityHeadersProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Baseline security headers for JSON APIs (CSP is intentionally minimal; tighten for browser-served HTML if added later).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@RequiredArgsConstructor
public class SecurityHeadersFilter extends OncePerRequestFilter {

    private final EventProSecurityHeadersProperties securityHeadersProperties;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        // API responses are JSON; avoid broad CSP until HTML is served from this service
        response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

        if (securityHeadersProperties.isHstsEnabled() && isSecureRequest(request)) {
            response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }

        filterChain.doFilter(request, response);
    }

    private static boolean isSecureRequest(HttpServletRequest request) {
        if (request.isSecure()) {
            return true;
        }
        String forwarded = request.getHeader("X-Forwarded-Proto");
        return forwarded != null && "https".equalsIgnoreCase(forwarded.trim());
    }
}
