package com.accessplus.eventpro.api.checkout;

import com.accessplus.eventpro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "checkout_outbox_events")
@Getter @Setter
public class CheckoutOutboxEventEntity extends BaseEntity {
    @Column(name = "event_type", nullable = false, length = 50) private String eventType;
    @Column(name = "aggregate_id", nullable = false, length = 100) private String aggregateId;
    @Column(name = "payload", nullable = false, columnDefinition = "TEXT") private String payload;
    @Column(name = "status", nullable = false, length = 20) private String status = "PENDING";
    @Column(name = "attempts", nullable = false) private int attempts;
    @Column(name = "next_attempt_at", nullable = false) private LocalDateTime nextAttemptAt;
    @Column(name = "last_error", length = 1000) private String lastError;
}
