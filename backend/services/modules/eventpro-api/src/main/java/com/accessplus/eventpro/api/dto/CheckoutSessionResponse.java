package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.api.checkout.CheckoutSessionEntity;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.util.UUID;

@Data
@Builder
public class CheckoutSessionResponse {
    private UUID id;
    private String status;
    private String expiresAt;
    private String serverTime;
    private BigDecimal subtotal;
    private BigDecimal addonAmount;
    private BigDecimal donationAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private BigDecimal walletAmount;
    private String currency;
    private String clientSecret;
    private String resumeToken;
    private String checkoutUrl;
    private UUID orderId;

    public static CheckoutSessionResponse from(CheckoutSessionEntity session) {
        return builder()
                .id(session.getId()).status(session.getStatus().name())
                .expiresAt(session.getExpiresAt().toInstant(ZoneOffset.UTC).toString())
                .serverTime(java.time.Instant.now().toString())
                .subtotal(session.getSubtotal()).addonAmount(session.getAddonAmount())
                .donationAmount(session.getDonationAmount()).taxAmount(session.getTaxAmount())
                .totalAmount(session.getTotalAmount()).walletAmount(session.getWalletAmount())
                .currency(session.getCurrency()).orderId(session.getOrderId()).build();
    }
}
