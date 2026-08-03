package com.accessplus.eventpro.payment.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StripeConfig {

    private static final Logger LOG = LoggerFactory.getLogger(StripeConfig.class);

    @Value("${stripe.secret.key:}")
    private String stripeSecretKey;

    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isEmpty()) {
            Stripe.apiKey = stripeSecretKey;
            LOG.info("Stripe API key initialized from environment variable");
        } else {
            LOG.warn("Stripe secret key not configured - payment processing will fail");
        }
    }
}
