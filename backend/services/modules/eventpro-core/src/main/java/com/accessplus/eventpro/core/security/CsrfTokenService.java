package com.accessplus.eventpro.core.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.stereotype.Service;

/**
 * Owns the raw cookie-backed CSRF token lifecycle for non-server-rendered clients.
 *
 * <p>The public endpoint intentionally calls this service instead of resolving the
 * {@code CsrfToken} request attribute. Spring's SPA handler masks that attribute for
 * BREACH protection, while header validation expects the raw value stored in the cookie.</p>
 */
@Service
@RequiredArgsConstructor
public class CsrfTokenService {

    private final CsrfTokenRepository csrfTokenRepository;

    public CsrfToken loadOrCreate(HttpServletRequest request, HttpServletResponse response) {
        CsrfToken currentRequestToken = RequestCachingCsrfTokenRepository.currentToken(request);
        if (currentRequestToken != null) {
            return currentRequestToken;
        }
        CsrfToken existing = csrfTokenRepository.loadToken(request);
        if (existing != null) {
            return existing;
        }
        return generateAndSave(request, response);
    }

    public CsrfToken rotate(HttpServletRequest request, HttpServletResponse response) {
        return generateAndSave(request, response);
    }

    private CsrfToken generateAndSave(HttpServletRequest request, HttpServletResponse response) {
        CsrfToken generated = csrfTokenRepository.generateToken(request);
        csrfTokenRepository.saveToken(generated, request, response);
        return generated;
    }
}
