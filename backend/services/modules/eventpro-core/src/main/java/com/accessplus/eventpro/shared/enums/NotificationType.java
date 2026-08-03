package com.accessplus.eventpro.shared.enums;

/**
 * Enum representing types of notifications in the system.
 * Framework-agnostic enum that works with both Spring Boot and Quarkus.
 */
public enum NotificationType {
    ORDER_CONFIRMATION,
    PAYMENT_SUCCESS,
    PAYMENT_FAILED,
    EVENT_REMINDER,
    TICKET_READY,
    SYSTEM_ANNOUNCEMENT
}
