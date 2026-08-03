package com.accessplus.eventpro.api.checkout;

import com.accessplus.eventpro.shared.entity.BaseEntity;
import com.accessplus.eventpro.shared.enums.TicketType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "checkout_session_tickets", uniqueConstraints =
        @UniqueConstraint(name = "uk_checkout_session_ticket", columnNames = {"checkout_session_id", "ticket_id"}))
@Getter
@Setter
public class CheckoutSessionTicketEntity extends BaseEntity {
    @Column(name = "checkout_session_id", nullable = false) private UUID checkoutSessionId;
    @Column(name = "ticket_id", nullable = false) private UUID ticketId;
    @Column(name = "event_id", nullable = false) private UUID eventId;
    @Enumerated(EnumType.STRING)
    @Column(name = "ticket_type", nullable = false, length = 30) private TicketType ticketType;
    @Column(name = "price", nullable = false, precision = 10, scale = 2) private BigDecimal price;
}
