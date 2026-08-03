package com.accessplus.eventpro.api.notification.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Global notification record (title, message, type). User-facing copies are in user_notifications.
 */
@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notification_type", columnList = "type"),
    @Index(name = "idx_notification_delivery", columnList = "delivery_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "type", nullable = false, length = 50)
    private String type; // ORDER_CONFIRMATION, PAYMENT_SUCCESS, PAYMENT_FAILED, EVENT_REMINDER, etc.

    @Column(name = "delivery_type", nullable = false, length = 20)
    private String deliveryType; // IN_APP, EMAIL, SMS, PUSH

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
