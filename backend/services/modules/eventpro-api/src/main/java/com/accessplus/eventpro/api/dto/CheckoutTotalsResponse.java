package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Subtotal, tax, and total for checkout. Use total for payment intent when tax is enabled. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutTotalsResponse {
    private BigDecimal subtotal;
    private double taxRatePercent;
    private BigDecimal tax;
    private BigDecimal total;
}
