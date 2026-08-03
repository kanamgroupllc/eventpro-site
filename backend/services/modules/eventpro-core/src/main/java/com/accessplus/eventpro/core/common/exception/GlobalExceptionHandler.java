package com.accessplus.eventpro.core.common.exception;

import com.accessplus.eventpro.shared.exception.BusinessException;
import com.accessplus.eventpro.shared.exception.ConflictException;
import com.accessplus.eventpro.shared.exception.ErrorResponse;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.UnauthorizedException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import com.accessplus.eventpro.core.security.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Arrays;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String LOCAL_PROFILE = "local";

    private final Environment environment;

    public GlobalExceptionHandler(Environment environment) {
        this.environment = environment;
    }
    
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException ex, WebRequest request) {
        logger.warn("Business exception: {}", ex.getMessage());
        
        HttpStatus status = determineHttpStatus(ex);
        ErrorResponse errorResponse = errorBuilder(request)
                .message(ex.getMessage())
                .code(errorCode(ex.getMessage()))
                .build();
        
        return new ResponseEntity<>(errorResponse, status);
    }
    
    /**
     * Handle resource not found exceptions.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        logger.warn("Resource not found: {}", ex.getMessage());
        
        ErrorResponse errorResponse = errorBuilder(request)
                .message(ex.getMessage())
                .code(errorCode(ex.getMessage()))
                .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            ValidationException ex, WebRequest request) {
        logger.warn("Validation error: {}", ex.getMessage());
        
        ErrorResponse errorResponse = errorBuilder(request)
                .message(ex.getMessage())
                .code(errorCode(ex.getMessage()))
                .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
    
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedException(
            UnauthorizedException ex, WebRequest request) {
        logger.warn("Unauthorized: {}", ex.getMessage());
        
        ErrorResponse errorResponse = errorBuilder(request)
                .message(ex.getMessage())
                .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }
    
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflictException(
            ConflictException ex, WebRequest request) {
        logger.warn("Conflict: {}", ex.getMessage());
        
        ErrorResponse errorResponse = errorBuilder(request)
                .message(ex.getMessage())
                .code(errorCode(ex.getMessage()))
                .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    private static String errorCode(String message) {
        if (message == null) return null;
        String candidate = message.contains(":") ? message.substring(0, message.indexOf(':')) : message;
        return candidate.matches("[A-Z][A-Z0-9_]+") ? candidate : null;
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, WebRequest request) {
        logger.warn("Validation error: {}", ex.getMessage());
        
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        String message = "Validation failed: " + errors.values().stream()
                .collect(Collectors.joining(", "));
        
        ErrorResponse errorResponse = errorBuilder(request)
                .message(message)
                .fields(errors)
                .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
    
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, WebRequest request) {
        logger.warn("Constraint violation: {}", ex.getMessage());
        
        String message = ex.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining(", "));
        
        ErrorResponse errorResponse = errorBuilder(request)
                .message("Validation failed: " + message)
                .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex, WebRequest request) {
        logger.warn("Access denied: {}", ex.getMessage());
        
        ErrorResponse errorResponse = errorBuilder(request)
                .message("You do not have permission to access this resource")
                .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }
    
    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            AuthenticationCredentialsNotFoundException ex, WebRequest request) {
        logger.warn("Authentication error: {}", ex.getMessage());
        
        ErrorResponse errorResponse = errorBuilder(request)
                .message("Authentication required")
                .build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }
    
    /**
     * Handle 404 when no controller matches the request (Spring Boot 3.2+).
     * If you see this for /api/v1/organizer/team, rebuild the backend and ensure migrations V20/V21 have run.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
            NoResourceFoundException ex, WebRequest request) {
        logger.warn("No resource found: {} {}", ex.getHttpMethod(), ex.getResourcePath());
        ErrorResponse errorResponse = errorBuilder(request)
                .message("Not found: no endpoint for " + ex.getResourcePath())
                .detail(ex.getMessage())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, WebRequest request) {
        logger.error("Unexpected error occurred", ex);
        
        String detail = ex.getClass().getSimpleName() + ": " + (ex.getMessage() != null ? ex.getMessage() : "");
        boolean isLocal = Arrays.asList(environment.getActiveProfiles()).contains(LOCAL_PROFILE);
        String message = isLocal && ex.getMessage() != null && !ex.getMessage().isBlank()
                ? ex.getMessage()
                : "An unexpected error occurred. Please try again later.";
        ErrorResponse.ErrorResponseBuilder builder = errorBuilder(request).message(message);
        if (isLocal) {
            builder.detail(detail);
        }
        ErrorResponse errorResponse = builder.build();
        
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    private ErrorResponse.ErrorResponseBuilder errorBuilder(WebRequest request) {
        return ErrorResponse.builder()
                .path(extractPath(request))
                .timestamp(Instant.now())
                .correlationId(MDC.get(CorrelationIdFilter.MDC_KEY));
    }

    private String extractPath(WebRequest request) {
        String description = request.getDescription(false);
        return description.replace("uri=", "");
    }
    
    private HttpStatus determineHttpStatus(BusinessException ex) {
        return switch (ex.getErrorCode()) {
            case "RESOURCE_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "VALIDATION_ERROR" -> HttpStatus.BAD_REQUEST;
            case "UNAUTHORIZED", "ACCESS_DENIED" -> HttpStatus.FORBIDDEN;
            case "CONFLICT" -> HttpStatus.CONFLICT;
            default -> HttpStatus.BAD_REQUEST;
        };
    }
}
