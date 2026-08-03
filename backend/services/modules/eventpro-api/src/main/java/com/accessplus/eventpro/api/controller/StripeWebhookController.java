package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.config.StripeSubscriptionConfig;
import com.accessplus.eventpro.core.notification.service.NotificationService;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.api.subscription.service.SubscriptionPaymentService;
import com.accessplus.eventpro.api.checkout.CheckoutSessionService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.Subscription;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
public class StripeWebhookController {

    @Value("${stripe.webhookSecret:}")
    private String webhookSecret;

    private final UserService userService;
    private final SubscriptionPaymentService subscriptionPaymentService;
    private final StripeSubscriptionConfig subscriptionConfig;
    private final NotificationService notificationService;
    private final CheckoutSessionService checkoutSessionService;

    @PostMapping("/stripe")
    public ResponseEntity<Map<String, Object>> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String stripeSignature) {
        if (stripeSignature == null || stripeSignature.isBlank() || webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("Stripe webhook called without signature or secret not set");
            return ResponseEntity.status(400).body(Map.of("error", "Missing signature or webhook secret not configured"));
        }
        Event event;
        try {
            event = Webhook.constructEvent(payload, stripeSignature, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.status(400).body(Map.of("error", "Invalid signature"));
        }

        String type = event.getType();
        log.debug("Stripe webhook: type={}", type);

        try {
            switch (type) {
                case "invoice.paid" -> handleInvoicePaid(event);
                case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
                case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
                case "payment_intent.succeeded" -> handlePaymentIntentSucceeded(event);
                default -> log.trace("Unhandled Stripe event type: {}", type);
            }
        } catch (Exception e) {
            log.error("Error processing Stripe webhook {}: {}", type, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Processing failed"));
        }

        return ResponseEntity.ok(Map.of("received", true));
    }

    private void handlePaymentIntentSucceeded(Event event) {
        Optional<?> object = event.getDataObjectDeserializer().getObject();
        if (object.isEmpty() || !(object.get() instanceof PaymentIntent intent)) {
            throw new IllegalArgumentException("payment_intent.succeeded payload is not a PaymentIntent");
        }
        checkoutSessionService.finalizeByPaymentIntent(intent.getId());
        log.info("Checkout finalized from Stripe webhook: paymentIntentId={}", intent.getId());
    }

    private void handleInvoicePaid(Event event) {
        Invoice invoice;
        try {
            Optional<?> opt = event.getDataObjectDeserializer().getObject();
            if (opt.isEmpty()) {
                log.warn("invoice.paid: could not deserialize event data");
                return;
            }
            Object obj = opt.get();
            if (!(obj instanceof Invoice)) {
                log.warn("invoice.paid event data is not an Invoice");
                return;
            }
            invoice = (Invoice) obj;
        } catch (Exception e) {
            log.warn("Failed to deserialize invoice: {}", e.getMessage());
            return;
        }

        String subscriptionId = invoice.getSubscription();
        if (subscriptionId == null || subscriptionId.isBlank()) {
            log.debug("invoice.paid has no subscription (one-time payment), skipping");
            return;
        }

        String customerId = invoice.getCustomer();
        if (customerId == null || customerId.isBlank()) {
            log.warn("invoice.paid has no customer");
            return;
        }

        UserEntity user;
        try {
            user = userService.getUserByStripeCustomerId(customerId);
        } catch (Exception e) {
            log.warn("No user found for Stripe customer {}: {}", customerId, e.getMessage());
            return;
        }

        String tier = "PRO";
        String period = "MONTHLY";
        try {
            Subscription subscription = Subscription.retrieve(subscriptionId);
            if (subscription.getItems() != null && subscription.getItems().getData() != null && !subscription.getItems().getData().isEmpty()) {
                var item = subscription.getItems().getData().get(0);
                if (item.getPrice() != null && item.getPrice().getId() != null) {
                    String priceId = item.getPrice().getId();
                    tier = tierFromPriceId(priceId);
                    period = periodFromPriceId(priceId);
                }
            }
        } catch (Exception e) {
            log.warn("Could not get subscription for tier/period, using defaults: {}", e.getMessage());
        }

        long amountPaid = invoice.getAmountPaid() != null ? invoice.getAmountPaid() : 0;
        BigDecimal amount = BigDecimal.valueOf(amountPaid).divide(BigDecimal.valueOf(100)); // cents to dollars
        Instant paidAt = invoice.getStatusTransitions() != null && invoice.getStatusTransitions().getPaidAt() != null
                ? Instant.ofEpochSecond(invoice.getStatusTransitions().getPaidAt())
                : Instant.now();

        subscriptionPaymentService.recordPayment(user.getId(), amount, tier, period, paidAt);
        userService.setSubscriptionTierAndOrganizerRole(user.getId(), tier);
        log.info("Processed invoice.paid: userId={}, tier={}, amount={}", user.getId(), tier, amount);
    }

    private void handleSubscriptionDeleted(Event event) {
        Object obj;
        try {
            Optional<?> opt = event.getDataObjectDeserializer().getObject();
            if (opt.isEmpty()) return;
            obj = opt.get();
        } catch (Exception e) {
            log.warn("Failed to deserialize subscription: {}", e.getMessage());
            return;
        }
        if (!(obj instanceof Subscription)) return;
        Subscription subscription = (Subscription) obj;
        String customerId = subscription.getCustomer();
        if (customerId == null || customerId.isBlank()) return;
        try {
            UserEntity user = userService.getUserByStripeCustomerId(customerId);
            userService.setSubscriptionTier(user.getId(), "BASIC");
            log.info("Subscription cancelled: userId={}, set tier to BASIC", user.getId());
        } catch (Exception e) {
            log.warn("No user for Stripe customer {} on subscription.deleted: {}", customerId, e.getMessage());
        }
    }

    private void handleSubscriptionUpdated(Event event) {
        Object obj;
        try {
            Optional<?> opt = event.getDataObjectDeserializer().getObject();
            if (opt.isEmpty()) return;
            obj = opt.get();
        } catch (Exception e) {
            log.warn("Failed to deserialize subscription: {}", e.getMessage());
            return;
        }
        if (!(obj instanceof Subscription)) return;
        Subscription subscription = (Subscription) obj;
        // active = paying; trialing = 14-day trial (no payment yet) – grant Pro/Enterprise in both cases
        String status = subscription.getStatus();
        if (status == null || (!"active".equals(status) && !"trialing".equals(status))) return;
        String customerId = subscription.getCustomer();
        if (customerId == null || customerId.isBlank()) return;
        try {
            UserEntity user = userService.getUserByStripeCustomerId(customerId);
            String tier = "PRO";
            if (subscription.getItems() != null && subscription.getItems().getData() != null && !subscription.getItems().getData().isEmpty()) {
                var item = subscription.getItems().getData().get(0);
                if (item.getPrice() != null && item.getPrice().getId() != null) {
                    tier = tierFromPriceId(item.getPrice().getId());
                }
            }
            userService.setSubscriptionTierAndOrganizerRole(user.getId(), tier);
            log.info("Subscription updated: userId={}, tier={}", user.getId(), tier);
            String first = user.getFirstName() != null ? user.getFirstName().trim() : "";
            String last = user.getLastName() != null ? user.getLastName().trim() : "";
            String name = (first + " " + last).trim();
            if (name.isBlank() && user.getEmail() != null) name = user.getEmail();
            notificationService.sendSubscriptionUpgradedEmail(user.getEmail(), name, tier);
        } catch (Exception e) {
            log.warn("Could not update user for subscription.updated: {}", e.getMessage());
        }
    }

    private String tierFromPriceId(String priceId) {
        if (priceId == null) return "PRO";
        if (priceId.equals(subscriptionConfig.getPriceIdEnterpriseMonthly()) || priceId.equals(subscriptionConfig.getPriceIdEnterpriseYearly())) {
            return "ENTERPRISE";
        }
        return "PRO";
    }

    private String periodFromPriceId(String priceId) {
        if (priceId == null) return "MONTHLY";
        if (priceId.equals(subscriptionConfig.getPriceIdProYearly()) || priceId.equals(subscriptionConfig.getPriceIdEnterpriseYearly())) {
            return "YEARLY";
        }
        return "MONTHLY";
    }
}
