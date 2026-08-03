package com.accessplus.eventpro.payment.stripe.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Billing address from Stripe (e.g. from PaymentMethod after card confirmation).
 * Used for tax jurisdiction and order record; Stripe may validate with card (AVS).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StripeBillingAddress {
    private String state;
    private String country;
}
