package com.accessplus.eventpro.payment.service.impl;

import com.accessplus.eventpro.payment.service.StripeService;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentConfirmParams;
import com.stripe.param.PaymentIntentCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class StripeServiceImpl implements StripeService {

    private static final Logger LOG = LoggerFactory.getLogger(StripeServiceImpl.class);

    @Override
    public String createPaymentIntent(BigDecimal amount) {
        try {
            long amountInCents = amount.multiply(BigDecimal.valueOf(100)).longValue();

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("usd")
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build()
                    )
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);
            LOG.info("Created Stripe Payment Intent: id={}, clientSecret={}",
                    paymentIntent.getId(), paymentIntent.getClientSecret());

            return paymentIntent.getClientSecret();
        } catch (StripeException e) {
            LOG.error("Error creating Stripe Payment Intent", e);
            throw new RuntimeException("Failed to create Stripe Payment Intent: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean confirmPaymentIntent(String paymentIntentId) {
        try {
            LOG.debug("Confirming payment intent: id={}", paymentIntentId);

            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);

            if (!"succeeded".equals(paymentIntent.getStatus())) {
                PaymentIntentConfirmParams params = PaymentIntentConfirmParams.builder().build();
                paymentIntent = paymentIntent.confirm(params);
            }

            boolean succeeded = "succeeded".equals(paymentIntent.getStatus());
            LOG.info("Payment intent confirmed: id={}, status={}",
                    paymentIntent.getId(), paymentIntent.getStatus());

            return succeeded;
        } catch (StripeException e) {
            LOG.error("Error confirming Stripe Payment Intent: {}", paymentIntentId, e);
            throw new RuntimeException("Failed to confirm Stripe Payment Intent: " + e.getMessage(), e);
        }
    }
}
