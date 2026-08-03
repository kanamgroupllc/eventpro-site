package com.accessplus.eventpro.core.notification.service;

import java.math.BigDecimal;

/**
 * Service for sending notifications (email, and optionally SQS for async/Lambda).
 * Use for order confirmations, ticket ready, event reminders, etc.
 */
public interface NotificationService {

    /**
     * Sends an order confirmation email to the purchaser after successful payment.
     * Does not throw; logs and swallows errors so payment flow is not affected.
     *
     * @param toEmail        recipient email (user or guest)
     * @param recipientName  first name or display name
     * @param orderNumber    order number
     * @param eventName      event name (may be null)
     * @param totalAmount    order total
     */
    void sendOrderConfirmationEmail(String toEmail, String recipientName, String orderNumber,
                                    String eventName, BigDecimal totalAmount);

    /**
     * Sends a single custom email (e.g. one recipient of an organizer broadcast).
     * Does not throw; logs errors. Used by organizer "Email attendees" (Pro/Enterprise).
     *
     * @param toEmail  recipient email
     * @param subject  subject line
     * @param bodyText plain-text body
     * @param bodyHtml HTML body (optional; if null, bodyText is used)
     */
    void sendOrganizerBroadcastEmail(String toEmail, String subject, String bodyText, String bodyHtml);

    /**
     * Sends a subscription-upgraded notification (e.g. when Stripe confirms Pro/Enterprise or trial).
     * Does not throw; logs errors so webhook flow is not affected.
     *
     * @param toEmail        recipient email
     * @param recipientName  first name or display name
     * @param tier           new tier (PRO or ENTERPRISE)
     */
    void sendSubscriptionUpgradedEmail(String toEmail, String recipientName, String tier);
}
