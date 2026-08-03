package com.accessplus.eventpro.api.checkout;

import com.accessplus.eventpro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "checkout_sessions")
@Getter
@Setter
public class CheckoutSessionEntity extends BaseEntity {
    @Column(name = "user_id") private UUID userId;
    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100) private String idempotencyKey;
    @Column(name = "resume_token_hash", nullable = false, unique = true, length = 64) private String resumeTokenHash;
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30) private CheckoutSessionStatus status;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @Column(name = "payment_intent_id", unique = true, length = 255) private String paymentIntentId;
    @Column(name = "order_id", unique = true) private UUID orderId;
    @Column(name = "guest_email", length = 255) private String guestEmail;
    @Column(name = "guest_first_name", length = 100) private String guestFirstName;
    @Column(name = "guest_last_name", length = 100) private String guestLastName;
    @Column(name = "buyer_state", length = 10) private String buyerState;
    @Column(name = "buyer_country", length = 2) private String buyerCountry;
    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2) private BigDecimal subtotal;
    @Column(name = "addon_amount", nullable = false, precision = 10, scale = 2) private BigDecimal addonAmount = BigDecimal.ZERO;
    @Column(name = "donation_amount", nullable = false, precision = 10, scale = 2) private BigDecimal donationAmount = BigDecimal.ZERO;
    @Column(name = "tax_amount", nullable = false, precision = 10, scale = 2) private BigDecimal taxAmount = BigDecimal.ZERO;
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2) private BigDecimal totalAmount;
    @Column(name = "wallet_amount", nullable = false, precision = 10, scale = 2) private BigDecimal walletAmount = BigDecimal.ZERO;
    @Column(name = "currency", nullable = false, length = 3) private String currency = "usd";
    @Column(name = "adjustments_json", columnDefinition = "TEXT") private String adjustmentsJson;
    @Column(name = "refund_id", length = 255) private String refundId;
}
