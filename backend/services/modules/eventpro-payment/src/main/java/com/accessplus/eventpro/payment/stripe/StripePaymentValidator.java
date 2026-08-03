package com.accessplus.eventpro.payment.stripe;

import com.accessplus.eventpro.shared.exception.ValidationException;
import com.stripe.model.PaymentIntent;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Validates Stripe PaymentIntent amounts against server-computed order totals.
 */
public final class StripePaymentValidator {

    private StripePaymentValidator() {
    }

    public static void validateAmount(PaymentIntent paymentIntent, BigDecimal expectedAmountDollars) {
        if (expectedAmountDollars == null) {
            throw new ValidationException("Expected payment amount is required.");
        }
        if (paymentIntent == null || paymentIntent.getAmount() == null) {
            throw new ValidationException("Payment intent amount is missing.");
        }
        long expectedCents = toCents(expectedAmountDollars);
        long actualCents = paymentIntent.getAmount();
        if (actualCents != expectedCents) {
            throw new ValidationException("Payment amount does not match order total.");
        }
    }

    public static long toCents(BigDecimal amountDollars) {
        return amountDollars.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();
    }
}
