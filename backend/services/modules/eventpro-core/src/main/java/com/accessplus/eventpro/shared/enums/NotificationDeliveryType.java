package com.accessplus.eventpro.shared.enums;

/**
 * Enum representing delivery types for notifications.
 * Framework-agnostic enum that works with both Spring Boot and Quarkus.
 */
public enum NotificationDeliveryType {
    EMAIL,
    SMS,
    IN_APP,
    PUSH
}
