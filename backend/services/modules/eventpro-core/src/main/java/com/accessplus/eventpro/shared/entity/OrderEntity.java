package com.accessplus.eventpro.shared.entity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Order entity representing customer orders.
 * Framework-agnostic entity that works with both Spring Boot and Quarkus.
 * 
 * <p>Note: Uses UUID references for cross-module relationships (user, event)
 * to maintain framework independence. Backend modules can add entity relationships
 * via @ManyToOne if needed for their specific use cases.
 */
@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_user", columnList = "user_id"),
    @Index(name = "idx_order_status", columnList = "status"),
    @Index(name = "idx_order_number", columnList = "order_number"),
    @Index(name = "idx_order_date", columnList = "order_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderEntity extends BaseEntity {

    @NotBlank(message = "Order number is required")
    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    private String orderNumber;

    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "0.0", message = "Total amount must be non-negative")
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    /** Optional donation amount included in total (Pro/Enterprise events with donations enabled). */
    @Column(name = "donation_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal donationAmount = BigDecimal.ZERO;

    /** Platform fee withheld for this order (from eventpro.platform.fee-percent). Used for 1099-K and payouts. */
    @Column(name = "platform_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal platformFee = BigDecimal.ZERO;

    /** Tax (sales tax / VAT) amount for this order. Zero when tax not applied. */
    @Column(name = "tax_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    /** Buyer state code (e.g. CA, NY) for sales tax jurisdiction. */
    @Column(name = "buyer_state", length = 10)
    private String buyerState;

    /** Buyer country code (e.g. US) for tax jurisdiction. */
    @Column(name = "buyer_country", length = 2)
    private String buyerCountry;

    @NotNull(message = "Order status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private OrderStatus status;

    @NotNull(message = "Order date is required")
    @Column(name = "order_date", nullable = false)
    private LocalDateTime orderDate;

    /**
     * User ID reference (UUID) when order is placed by authenticated user.
     * Null for guest checkout.
     */
    @Column(name = "user_id")
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID userId;

    @Column(name = "guest_email", length = 255)
    private String guestEmail;

    @Column(name = "guest_first_name", length = 100)
    private String guestFirstName;

    @Column(name = "guest_last_name", length = 100)
    private String guestLastName;

    @Column(name = "guest_phone", length = 20)
    private String guestPhone;

    /** Attribution: how the buyer heard about the event (checkout). */
    @Column(name = "how_did_you_hear", length = 100)
    private String howDidYouHear;

    @Column(name = "receive_ticket_via_whatsapp")
    private Boolean receiveTicketViaWhatsApp = false;

    @Column(name = "receive_ticket_via_sms")
    private Boolean receiveTicketViaSms = false;

    @Column(name = "payment_intent_id", length = 255)
    private String paymentIntentId;

    @Column(name = "wallet_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal walletAmount = BigDecimal.ZERO;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    /**
     * Order items relationship.
     * This is within the same domain, so entity relationship is fine.
     */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<OrderItemEntity> orderItems = new ArrayList<>();
}

