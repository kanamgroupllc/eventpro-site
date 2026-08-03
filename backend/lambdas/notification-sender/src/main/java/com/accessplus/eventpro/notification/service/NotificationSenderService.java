package com.accessplus.eventpro.notification.service;

import com.accessplus.eventpro.shared.model.NotificationMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class NotificationSenderService {

    private static final Logger LOG = LoggerFactory.getLogger(NotificationSenderService.class);

    private final EmailService emailService;
    private final SMSService smsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NotificationSenderService(EmailService emailService, SMSService smsService) {
        this.emailService = emailService;
        this.smsService = smsService;
    }

    public void sendNotification(String messageBody) throws NotificationProcessingException {
        try {
            NotificationMessage notificationMessage = objectMapper.readValue(messageBody, NotificationMessage.class);
            LOG.info("Processing notification: type={}, userId={}",
                    notificationMessage.getMessageType(),
                    notificationMessage.getPayload() != null ? notificationMessage.getPayload().getUserId() : "N/A");

            NotificationMessage.NotificationPayload payload = notificationMessage.getPayload();
            if (payload == null) {
                throw new NotificationProcessingException("Notification payload is null");
            }

            List<String> deliveryTypes = payload.getDeliveryTypes();
            if (deliveryTypes == null || deliveryTypes.isEmpty()) {
                LOG.warn("No delivery types specified, defaulting to EMAIL and IN_APP");
                deliveryTypes = List.of("EMAIL", "IN_APP");
            }

            for (String deliveryType : deliveryTypes) {
                try {
                    switch (deliveryType.toUpperCase()) {
                        case "EMAIL" -> sendEmail(notificationMessage);
                        case "SMS" -> sendSMS(notificationMessage);
                        case "IN_APP" -> storeInAppNotification(notificationMessage);
                        case "PUSH" -> LOG.debug("Push notification not yet implemented for message: {}", notificationMessage.getMessageId());
                        default -> LOG.warn("Unknown delivery type: {}", deliveryType);
                    }
                } catch (Exception e) {
                    LOG.error("Error sending notification via {} for message: {}", deliveryType, notificationMessage.getMessageId(), e);
                }
            }

            LOG.info("Notification processed successfully: messageId={}", notificationMessage.getMessageId());
        } catch (NotificationProcessingException e) {
            throw e;
        } catch (Exception e) {
            LOG.error("Unexpected error processing notification message", e);
            throw new NotificationProcessingException("Unexpected error processing notification", e);
        }
    }

    private void sendEmail(NotificationMessage message) {
        NotificationMessage.NotificationPayload payload = message.getPayload();
        String email = payload.getEmail();

        if (email == null || email.isEmpty()) {
            LOG.warn("Email address not provided for notification: {}", message.getMessageId());
            return;
        }

        String subject = getEmailSubject(message.getMessageType());
        String htmlBody = generateEmailBody(message, true);
        String textBody = generateEmailBody(message, false);

        emailService.sendEmail(email, subject, htmlBody, textBody);
        LOG.debug("Email sent for notification: messageId={}", message.getMessageId());
    }

    private void sendSMS(NotificationMessage message) {
        NotificationMessage.NotificationPayload payload = message.getPayload();
        String phoneNumber = payload.getPhoneNumber();

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            LOG.warn("Phone number not provided for notification: {}", message.getMessageId());
            return;
        }

        String smsMessage = generateSMSBody(message);
        smsService.sendSMS(phoneNumber, smsMessage);
        LOG.debug("SMS sent for notification: messageId={}", message.getMessageId());
    }

    private void storeInAppNotification(NotificationMessage message) {
        LOG.info("In-app notification stored (simulated): messageId={}, userId={}",
                message.getMessageId(),
                message.getPayload().getUserId());
    }

    private String getEmailSubject(String messageType) {
        return switch (messageType) {
            case "ORDER_CONFIRMATION", "PAYMENT_SUCCESS" -> "Order Confirmation - KanamEvents";
            case "PAYMENT_FAILED" -> "Payment Failed - KanamEvents";
            case "EVENT_REMINDER" -> "Event Reminder - KanamEvents";
            case "TICKET_READY" -> "Your Tickets Are Ready - KanamEvents";
            case "SYSTEM_ANNOUNCEMENT" -> "KanamEvents Announcement";
            default -> "Notification from KanamEvents";
        };
    }

    private String generateEmailBody(NotificationMessage message, boolean html) {
        NotificationMessage.NotificationPayload payload = message.getPayload();
        Map<String, Object> templateData = payload.getTemplateData();

        String lineBreak = html ? "<br>" : "\n";
        StringBuilder body = new StringBuilder();

        if (html) {
            body.append("<html><body>");
        }

        switch (message.getMessageType()) {
            case "ORDER_CONFIRMATION", "PAYMENT_SUCCESS" -> {
                body.append("Thank you for your order!").append(lineBreak).append(lineBreak);
                if (templateData != null) {
                    body.append("Order Number: ").append(templateData.get("orderNumber")).append(lineBreak);
                    body.append("Total Amount: $").append(templateData.get("totalAmount")).append(lineBreak);
                    if (templateData.containsKey("eventName")) {
                        body.append("Event: ").append(templateData.get("eventName")).append(lineBreak);
                    }
                }
            }
            case "PAYMENT_FAILED" -> {
                body.append("We're sorry, but your payment could not be processed.").append(lineBreak).append(lineBreak);
                body.append("Please try again or contact support if the problem persists.").append(lineBreak);
            }
            case "EVENT_REMINDER" -> {
                body.append("Reminder: You have an upcoming event!").append(lineBreak).append(lineBreak);
                if (templateData != null && templateData.containsKey("eventName")) {
                    body.append("Event: ").append(templateData.get("eventName")).append(lineBreak);
                    if (templateData.containsKey("eventDate")) {
                        body.append("Date: ").append(templateData.get("eventDate")).append(lineBreak);
                    }
                }
            }
            case "TICKET_READY" -> {
                body.append("Your tickets are ready for download!").append(lineBreak).append(lineBreak);
                body.append("You can download your tickets from your account.").append(lineBreak);
            }
            default -> body.append("You have a new notification from KanamEvents.").append(lineBreak);
        }

        if (html) {
            body.append("</body></html>");
        }

        return body.toString();
    }

    private String generateSMSBody(NotificationMessage message) {
        NotificationMessage.NotificationPayload payload = message.getPayload();
        Map<String, Object> templateData = payload.getTemplateData();

        StringBuilder body = new StringBuilder();
        body.append("KanamEvents: ");

        switch (message.getMessageType()) {
            case "ORDER_CONFIRMATION", "PAYMENT_SUCCESS" -> {
                body.append("Order confirmed. ");
                if (templateData != null) {
                    body.append("Order #").append(templateData.get("orderNumber"));
                }
            }
            case "PAYMENT_FAILED" -> body.append("Payment failed. Please try again.");
            case "EVENT_REMINDER" -> body.append("Reminder: Event coming up soon!");
            case "TICKET_READY" -> body.append("Your tickets are ready for download!");
            default -> body.append("You have a new notification.");
        }

        return body.toString();
    }

    public static class NotificationProcessingException extends Exception {
        public NotificationProcessingException(String message) {
            super(message);
        }

        public NotificationProcessingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
