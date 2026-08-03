package com.accessplus.eventpro.core.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.util.StringUtils;

import java.util.function.Supplier;

/**
 * SPA request handling that retains BREACH masking without eagerly loading the token.
 *
 * <p>Spring Security's {@code csrf.spa()} handler intentionally loads the token on
 * every request so a JavaScript-readable cookie is always available. EventPro keeps
 * that cookie HttpOnly and exposes the raw value only from {@code /api/v1/csrf}, so
 * eager loading would let parallel safe requests race to replace the cookie.</p>
 */
public final class DeferredSpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {

    private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
    private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       Supplier<CsrfToken> deferredCsrfToken) {
        xor.handle(request, response, deferredCsrfToken);
    }

    @Override
    public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
        return StringUtils.hasText(request.getHeader(csrfToken.getHeaderName()))
                ? plain.resolveCsrfTokenValue(request, csrfToken)
                : xor.resolveCsrfTokenValue(request, csrfToken);
    }
}
