package com.accessplus.eventpro.shared.exception;

/**
 * Exception thrown when a resource conflict occurs (e.g., duplicate entry).
 */
public class ConflictException extends BusinessException {

    public ConflictException(String message) {
        super("CONFLICT", message);
    }

    public ConflictException(String resourceType, String field, String value) {
        super("CONFLICT",
            String.format("%s with %s '%s' already exists", resourceType, field, value));
    }
}
