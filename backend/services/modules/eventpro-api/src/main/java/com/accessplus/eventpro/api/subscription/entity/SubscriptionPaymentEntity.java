package com.accessplus.eventpro.api.subscription.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "subscription_payments", indexes = {
    @Index(name = "idx_subscription_payments_user_id", columnList = "user_id"),
    @Index(name = "idx_subscription_payments_paid_at", columnList = "paid_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPaymentEntity {

    @Id
    @GeneratedValue
    @JdbcTypeCode(SqlTypes.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID userId;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt;

    @Column(name = "tier", nullable = false, length = 20)
    private String tier;

    @Column(name = "period", nullable = false, length = 20)
    private String period = "MONTHLY";
}
