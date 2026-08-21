package com.accessplus.eventpro.core.email.service.impl;

import com.accessplus.eventpro.core.email.service.EmailService;
import com.accessplus.eventpro.core.messaging.sqs.SQSMessagePublisher;
import com.accessplus.eventpro.shared.model.NotificationMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Provider-neutral email dispatcher. Delivery is owned by notification-sender.
 */
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {
    private final SQSMessagePublisher publisher;

    @Override
    public void sendPasswordResetConfirmation(String email, String code) {
        publish("PASSWORD_RESET_CONFIRMATION", email, null, null, Map.of("code", code));
    }

    @Override
    public void sendOrderConfirmation(String toEmail, String recipientName, String orderNumber,
                                      String eventName, BigDecimal totalAmount) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("recipientName", recipientName == null ? "Guest" : recipientName);
        data.put("orderNumber", orderNumber);
        data.put("eventName", eventName == null ? "Your event" : eventName);
        data.put("totalAmount", totalAmount == null ? BigDecimal.ZERO : totalAmount);
        publish("ORDER_CONFIRMATION", toEmail, null, null, data);
    }

    @Override
    public void sendCustomEmail(String toEmail, String subject, String bodyText, String bodyHtml) {
        publish("CUSTOM_EMAIL", toEmail, subject, bodyText, Map.of());
    }

    private void publish(String type, String email, String subject, String textBody, Map<String, Object> templateData) {
        if (email == null || email.isBlank()) throw new IllegalArgumentException("Recipient email is required");
        NotificationMessage message = new NotificationMessage();
        message.setSchemaVersion(2);
        message.setMessageId(UUID.randomUUID());
        message.setMessageType(type);
        message.setTimestamp(Instant.now().toString());
        message.setSource("eventpro-api");
        NotificationMessage.NotificationPayload payload = new NotificationMessage.NotificationPayload();
        payload.setEmail(email.trim());
        payload.setDeliveryTypes(List.of("EMAIL"));
        payload.setSubject(subject);
        payload.setTextBody(textBody);
        payload.setTemplateData(templateData);
        message.setPayload(payload);
        publisher.publishNotificationMessage(message);
    }
}
