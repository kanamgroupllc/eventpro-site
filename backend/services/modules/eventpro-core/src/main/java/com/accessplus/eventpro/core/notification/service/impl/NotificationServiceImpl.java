package com.accessplus.eventpro.core.notification.service.impl;

import com.accessplus.eventpro.core.email.service.EmailService;
import com.accessplus.eventpro.core.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final EmailService emailService;

    @Value("${eventpro.notifications.order-confirmation-enabled:true}")
    private boolean orderConfirmationEnabled;

    @Value("${eventpro.notifications.organizer-email-attendees-enabled:true}")
    private boolean organizerEmailAttendeesEnabled;

    @Value("${eventpro.notifications.subscription-upgraded-enabled:true}")
    private boolean subscriptionUpgradedEnabled;

    @Override
    public void sendOrderConfirmationEmail(String toEmail, String recipientName, String orderNumber,
                                           String eventName, BigDecimal totalAmount) {
        if (!orderConfirmationEnabled) {
            log.debug("Order confirmation email disabled by config, skipping: orderNumber={}", orderNumber);
            return;
        }
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Cannot send order confirmation: no recipient email for orderNumber={}", orderNumber);
            return;
        }
        try {
            emailService.sendOrderConfirmation(toEmail, recipientName, orderNumber, eventName, totalAmount);
        } catch (Exception e) {
            log.error("Failed to send order confirmation email: orderNumber={}, to={}, error={}",
                    orderNumber, toEmail, e.getMessage(), e);
            // Do not rethrow – payment already succeeded
        }
    }

    @Override
    public void sendOrganizerBroadcastEmail(String toEmail, String subject, String bodyText, String bodyHtml) {
        if (!organizerEmailAttendeesEnabled) {
            log.debug("Organizer email attendees disabled by config, skipping: to={}", toEmail);
            return;
        }
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Cannot send organizer broadcast: no recipient email");
            return;
        }
        try {
            emailService.sendCustomEmail(toEmail, subject, bodyText, bodyHtml);
        } catch (Exception e) {
            log.error("Failed to send organizer broadcast email: to={}, error={}", toEmail, e.getMessage(), e);
        }
    }

    @Override
    public void sendSubscriptionUpgradedEmail(String toEmail, String recipientName, String tier) {
        if (!subscriptionUpgradedEnabled) {
            log.debug("Subscription upgraded email disabled by config, skipping: to={}", toEmail);
            return;
        }
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Cannot send subscription upgraded email: no recipient email");
            return;
        }
        String name = recipientName != null && !recipientName.isBlank() ? recipientName : "there";
        String tierLabel = (tier != null && !tier.isBlank()) ? tier : "Pro";
        String subject = "You're now on KanamEvents " + tierLabel;
        String bodyText = "Hi " + name + ",\n\nYour KanamEvents plan has been upgraded. You now have organizer access and can create and manage events.\n\nLog in to get started — your " + tierLabel + " plan is active.";
        String bodyHtml = "<p>Hi " + name + ",</p><p>Your KanamEvents plan has been upgraded. You now have <strong>organizer access</strong> and can create and manage events.</p><p>Log in to get started — your " + tierLabel + " plan is active.</p>";
        try {
            emailService.sendCustomEmail(toEmail, subject, bodyText, bodyHtml);
        } catch (Exception e) {
            log.error("Failed to send subscription upgraded email: to={}, error={}", toEmail, e.getMessage(), e);
        }
    }
}
