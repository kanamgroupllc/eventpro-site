package com.accessplus.eventpro.api.config;

import com.accessplus.eventpro.shared.exception.ErrorResponse;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.Instant;

/**
 * Keeps Resilience4j types out of eventpro-core.
 */
@RestControllerAdvice
@Order(1)
public class CircuitBreakerExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(CircuitBreakerExceptionHandler.class);

    @ExceptionHandler(CallNotPermittedException.class)
    public ResponseEntity<ErrorResponse> handleCircuitBreakerOpen(CallNotPermittedException ex, WebRequest request) {
        log.warn("Circuit breaker open (upstream): {}", ex.getMessage());
        String path = request.getDescription(false).replace("uri=", "");
        ErrorResponse body = ErrorResponse.builder()
                .message("Payment service is temporarily unavailable. Please try again shortly.")
                .path(path)
                .timestamp(Instant.now())
                .detail(ex.getClass().getSimpleName())
                .build();
        return new ResponseEntity<>(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
