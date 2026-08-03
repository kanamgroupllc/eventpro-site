package com.accessplus.eventpro.shared.entity;

import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Table(name = "tickets", indexes = {
    @Index(name = "idx_ticket_event", columnList = "event_id"),
    @Index(name = "idx_ticket_status", columnList = "ticket_status"),
    @Index(name = "idx_ticket_type", columnList = "ticket_type"),
    @Index(name = "idx_ticket_purchaser", columnList = "purchaser_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketEntity extends BaseEntity {

    @NotBlank(message = "Ticket name is required")
    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @NotNull(message = "Ticket price is required")
    @DecimalMin(value = "0.0", message = "Ticket price must be non-negative")
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @NotNull(message = "Ticket type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "ticket_type", nullable = false, columnDefinition = "ticket_type")
    private TicketType ticketType;

    @NotNull(message = "Ticket status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "ticket_status", nullable = false, columnDefinition = "ticket_status")
    private TicketStatus ticketStatus;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "qr_code", length = 500)
    private String qrCode;

    @Column(name = "print_out_url", length = 500)
    private String printOutUrl;

    /**
     * Event ID reference (UUID) instead of entity relationship
     * to maintain framework independence.
     */
    @NotNull(message = "Event ID is required")
    @Column(name = "event_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID eventId;

    /**
     * Purchaser ID reference (UUID) - nullable because tickets can be
     * created before being purchased.
     */
    @Column(name = "purchaser_id")
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID purchaserId;

    /**
     * Creator ID reference (UUID) - user who created the ticket.
     */
    @NotNull(message = "Creator ID is required")
    @Column(name = "creator_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID creatorId;

    /**
     * When this reservation expires (for RESERVED tickets). After this time the ticket
     * is released back to AVAILABLE if still RESERVED. Null for non-reserved or sold.
     */
    @Column(name = "reserved_until")
    private java.time.LocalDateTime reservedUntil;

    /** Reserved seating: section name (e.g. Orchestra). Null for general admission. */
    @Column(name = "seat_section", length = 100)
    private String seatSection;

    /** Reserved seating: row label (e.g. A, B). Null for general admission. */
    @Column(name = "seat_row", length = 20)
    private String seatRow;

    /** Reserved seating: seat number in row. Null for general admission. */
    @Column(name = "seat_number")
    private Integer seatNumber;

    /** Door check-in: set when attendee is validated at the event. */
    @Column(name = "checked_in", nullable = false)
    private Boolean checkedIn = false;

    /** When this ticket was checked in at the door. */
    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;
}

