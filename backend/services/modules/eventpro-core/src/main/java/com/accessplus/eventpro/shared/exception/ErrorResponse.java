package com.accessplus.eventpro.shared.exception;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

/**
 * Standard error response format for REST API.
 *
 * <p><strong>Core Fields:</strong></p>
 * <ul>
 *   <li>{@code message} - Human-readable error message</li>
 *   <li>{@code path} - Request path where the error occurred</li>
 * </ul>
 *
 * <p><strong>Optional Fields:</strong></p>
 * <ul>
 *   <li>{@code fields} - Field-specific validation errors (only for validation errors)</li>
 *   <li>{@code timestamp} - When error occurred (useful for debugging/log correlation)</li>
 * </ul>
 *
 * <p>Example error response:</p>
 * <pre>{@code
 * {
 *   "message": "Validation failed: email is required",
 *   "path": "/api/v1/users",
 *   "fields": {
 *     "email": "email is required",
 *     "password": "password must be at least 8 characters"
 *   },
 *   "timestamp": "2025-01-15T10:30:00.000Z"
 * }
 * }</pre>
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    /**
     * Human-readable error message.
     * Example: "The email field is required"
     */
    private String message;

    /** Stable machine-readable code when the exception message begins with CODE:. */
    private String code;

    /**
     * Request path where the error occurred.
     * Example: "/api/v1/users"
     */
    private String path;

    /**
     * Extension: Field-specific validation errors (only populated for validation errors).
     * Example: {"email": "email is required", "password": "password must be at least 8 characters"}
     *
     * This provides structured field-level error information for better client handling.
     */
    private Map<String, String> fields;

    /**
     * Extension: Timestamp when the error occurred (ISO-8601 format).
     * Useful for debugging, log correlation, and client-side error tracking.
     * Example: "2025-01-15T10:30:00.000Z"
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", timezone = "UTC")
    private Instant timestamp;

    /**
     * Optional detail for server errors (e.g. exception type and message).
     * Can be omitted in production for security.
     */
    private String detail;

    /**
     * Correlation ID for tracing this request across logs and support tickets.
     */
    private String correlationId;
}
