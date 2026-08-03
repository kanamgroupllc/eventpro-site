package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmPaymentRequest {

    /** Stripe payment intent ID. Optional when wallet covers the full order total. */
    private String paymentIntentId;

    /** Electric Wallet credits to apply (must be <= balance and <= order total). */
    @DecimalMin(value = "0", message = "Wallet amount must be non-negative")
    private BigDecimal walletAmount;

    /** Buyer state (e.g. CA, NY) for jurisdiction-based sales tax. Optional. */
    private String state;

    /** Buyer country (e.g. US) for tax jurisdiction. Optional. */
    private String country;
}

