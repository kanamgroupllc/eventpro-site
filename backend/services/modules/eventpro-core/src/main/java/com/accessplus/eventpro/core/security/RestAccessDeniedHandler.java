package com.accessplus.eventpro.core.security;

import com.accessplus.eventpro.shared.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.InvalidCsrfTokenException;
import org.springframework.security.web.csrf.MissingCsrfTokenException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

/** Writes filter-chain authorization failures in the API's standard JSON format. */
@Slf4j
@Component
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private static final String CSRF_TOKEN_MISSING = "CSRF_TOKEN_MISSING";
    private static final String CSRF_TOKEN_INVALID = "CSRF_TOKEN_INVALID";
    private static final String ACCESS_DENIED = "ACCESS_DENIED";

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException exception) throws IOException {
        String code;
        String message;
        if (exception instanceof MissingCsrfTokenException) {
            code = CSRF_TOKEN_MISSING;
            message = "A CSRF token is required for this request";
        } else if (exception instanceof InvalidCsrfTokenException) {
            code = CSRF_TOKEN_INVALID;
            message = "The CSRF token is invalid or expired";
        } else {
            code = ACCESS_DENIED;
            message = "You do not have permission to access this resource";
        }

        log.warn("Request denied: code={}, method={}, path={}", code, request.getMethod(), request.getRequestURI());

        ErrorResponse body = ErrorResponse.builder()
                .code(code)
                .message(message)
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .correlationId(MDC.get(CorrelationIdFilter.MDC_KEY))
                .build();

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
