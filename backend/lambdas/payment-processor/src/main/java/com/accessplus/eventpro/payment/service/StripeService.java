package com.accessplus.eventpro.payment.service;

import java.math.BigDecimal;

public interface StripeService {

    String createPaymentIntent(BigDecimal amount);

    boolean confirmPaymentIntent(String paymentIntentId);
}
