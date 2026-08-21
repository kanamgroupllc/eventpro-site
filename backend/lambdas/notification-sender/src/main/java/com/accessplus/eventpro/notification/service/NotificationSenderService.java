package com.accessplus.eventpro.notification.service;

import com.accessplus.eventpro.shared.model.NotificationMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class NotificationSenderService {
    private static final Logger LOG = LoggerFactory.getLogger(NotificationSenderService.class);
    private static final long MAX_RAW_ATTACHMENT_BYTES = 25L * 1024 * 1024;

    private final EmailService emailService;
    private final SMSService smsService;
    private final ObjectMapper objectMapper;
    private final TicketManifestReader manifestReader;
    private final DeliveryLedger deliveryLedger;

    public NotificationSenderService(EmailService emailService, SMSService smsService, ObjectMapper objectMapper,
                                     TicketManifestReader manifestReader, DeliveryLedger deliveryLedger) {
        this.emailService = emailService;
        this.smsService = smsService;
        this.objectMapper = objectMapper;
        this.manifestReader = manifestReader;
        this.deliveryLedger = deliveryLedger;
    }

    public void sendNotification(String messageBody) throws NotificationProcessingException {
        try {
            JsonNode raw = objectMapper.readTree(messageBody);
            if (!(raw instanceof ObjectNode envelope)) throw new IllegalArgumentException("Notification envelope must be an object");
            JsonNode timestamp = envelope.get("timestamp");
            if (timestamp != null && !timestamp.isTextual()) envelope.put("timestamp", timestamp.toString());
            NotificationMessage message = objectMapper.treeToValue(envelope, NotificationMessage.class);
            if (message.getPayload() == null) throw new IllegalArgumentException("Notification payload is required");
            if (message.getMessageId() == null) {
                message.setMessageId(UUID.nameUUIDFromBytes(messageBody.getBytes(StandardCharsets.UTF_8)));
            }
            List<String> deliveryTypes = message.getPayload().getDeliveryTypes();
            if (deliveryTypes == null || deliveryTypes.isEmpty()) deliveryTypes = List.of("EMAIL");
            for (String type : deliveryTypes) {
                switch (type.toUpperCase()) {
                    case "EMAIL" -> sendEmail(message);
                    case "SMS" -> sendSms(message);
                    case "IN_APP" -> LOG.info("In-app notification acknowledged: messageId={}", message.getMessageId());
                    case "PUSH" -> LOG.info("Push notification is not configured: messageId={}", message.getMessageId());
                    default -> throw new IllegalArgumentException("Unknown delivery type: " + type);
                }
            }
        } catch (Exception error) {
            LOG.error("Notification failed without logging recipient or message content", error);
            throw new NotificationProcessingException("Notification processing failed", error);
        }
    }

    private void sendEmail(NotificationMessage message) throws Exception {
        if ("ORDER_TICKETS".equals(message.getMessageType()) && message.getPayload().getManifestKey() != null) {
            sendTicketEmail(message);
            return;
        }
        var payload = message.getPayload();
        if (payload.getEmail() == null || payload.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email recipient is required");
        }
        String subject = subject(message);
        String text = text(message);
        String html = "<html><body style=\"font-family:Arial,sans-serif;max-width:640px;margin:auto\">"
                + escape(text).replace("\n", "<br>") + "</body></html>";
        deliver(message, payload.getEmail(), subject, html, text, List.of(), 1);
    }

    private void sendTicketEmail(NotificationMessage message) throws Exception {
        TicketManifestReader.OrderEmailManifest manifest = manifestReader.read(message.getPayload().getManifestKey());
        if (message.getPayload().getOrderId() != null && !message.getPayload().getOrderId().equals(manifest.orderId())) {
            throw new IllegalArgumentException("Notification order does not match its manifest");
        }
        if (message.getPayload().getOrderNumber() != null
                && !message.getPayload().getOrderNumber().equals(manifest.orderNumber())) {
            throw new IllegalArgumentException("Notification order number does not match its manifest");
        }
        if (manifest.recipientEmail() == null || manifest.recipientEmail().isBlank()) {
            throw new IllegalArgumentException("Ticket manifest has no recipient");
        }
        List<EmailService.EmailAttachment> all = new ArrayList<>();
        for (var ticket : manifest.tickets()) {
            byte[] content = manifestReader.readAttachment(ticket.pdfKey());
            if (content.length > MAX_RAW_ATTACHMENT_BYTES) {
                throw new IllegalArgumentException("A ticket PDF exceeds the safe Resend attachment limit");
            }
            all.add(new EmailService.EmailAttachment(ticket.filename(), content));
        }
        List<List<EmailService.EmailAttachment>> parts = partition(all);
        String baseSubject = "Your tickets – Order " + manifest.orderNumber();
        String text = ticketText(manifest);
        String html = ticketHtml(manifest);
        for (int index = 0; index < parts.size(); index++) {
            String subject = parts.size() == 1 ? baseSubject : baseSubject + " (" + (index + 1) + " of " + parts.size() + ")";
            deliver(message, manifest.recipientEmail(), subject, html, text, parts.get(index), index + 1);
        }
    }

    private void deliver(NotificationMessage message, String to, String subject, String html, String text,
                         List<EmailService.EmailAttachment> attachments, int partNumber) {
        String prefix = "ORDER_TICKETS".equals(message.getMessageType()) ? "order-email/" : "email/";
        String deliveryKey = prefix + message.getMessageId() + "/" + partNumber;
        if (deliveryLedger.isSent(deliveryKey)) {
            LOG.info("Skipping completed delivery: key={}", deliveryKey);
            return;
        }
        String providerId = emailService.sendEmail(to, sanitizeSubject(subject), html, text, attachments, deliveryKey);
        deliveryLedger.markSent(deliveryKey, message.getMessageType(), providerId);
        LOG.info("Email accepted by provider: key={}, providerMessageId={}", deliveryKey, providerId);
    }

    private void sendSms(NotificationMessage message) {
        String phone = message.getPayload().getPhoneNumber();
        if (phone == null || phone.isBlank()) throw new IllegalArgumentException("SMS phone number is required");
        smsService.sendSMS(phone, text(message));
    }

    private static List<List<EmailService.EmailAttachment>> partition(List<EmailService.EmailAttachment> attachments) {
        if (attachments.isEmpty()) return List.of(List.of());
        List<List<EmailService.EmailAttachment>> parts = new ArrayList<>();
        List<EmailService.EmailAttachment> current = new ArrayList<>();
        long size = 0;
        for (var attachment : attachments) {
            if (!current.isEmpty() && size + attachment.content().length > MAX_RAW_ATTACHMENT_BYTES) {
                parts.add(List.copyOf(current));
                current.clear();
                size = 0;
            }
            current.add(attachment);
            size += attachment.content().length;
        }
        parts.add(List.copyOf(current));
        return parts;
    }

    private static String subject(NotificationMessage message) {
        if (message.getPayload().getSubject() != null && !message.getPayload().getSubject().isBlank()) {
            return message.getPayload().getSubject();
        }
        return switch (message.getMessageType()) {
            case "PASSWORD_RESET_CONFIRMATION" -> "Password Reset Confirmation - KanamEvents";
            case "ORDER_CONFIRMATION", "PAYMENT_SUCCESS" -> "Order Confirmation - KanamEvents";
            case "PAYMENT_FAILED" -> "Payment Failed - KanamEvents";
            default -> "Notification from KanamEvents";
        };
    }

    private static String text(NotificationMessage message) {
        var payload = message.getPayload();
        if (payload.getTextBody() != null) return payload.getTextBody();
        Map<String, Object> data = payload.getTemplateData() == null ? Map.of() : payload.getTemplateData();
        return switch (message.getMessageType()) {
            case "PASSWORD_RESET_CONFIRMATION" ->
                    "Your password has been successfully reset.\n\nVerification code: " + value(data, "code");
            case "ORDER_CONFIRMATION", "PAYMENT_SUCCESS" ->
                    "Thank you for your order.\n\nOrder number: " + value(data, "orderNumber")
                            + "\nEvent: " + value(data, "eventName") + "\nTotal: $" + value(data, "totalAmount");
            case "PAYMENT_FAILED" -> "Your payment could not be processed. Please try again or contact support.";
            default -> "You have a new notification from KanamEvents.";
        };
    }

    private static String ticketText(TicketManifestReader.OrderEmailManifest manifest) {
        StringBuilder text = new StringBuilder("Hi ").append(manifest.recipientName()).append(",\n\n")
                .append("Your order is confirmed and your tickets are attached.\n")
                .append("Order: ").append(manifest.orderNumber()).append("\n")
                .append("Total: ").append(manifest.currency()).append(" ").append(manifest.totalAmount()).append("\n\n");
        for (var ticket : manifest.tickets()) {
            text.append(ticket.eventName()).append(" — ").append(ticket.eventStart())
                    .append(" — ").append(ticket.venue()).append("\n");
        }
        return text.append("\nPresent each attached QR ticket at entry.").toString();
    }

    private static String ticketHtml(TicketManifestReader.OrderEmailManifest manifest) {
        StringBuilder rows = new StringBuilder();
        for (var ticket : manifest.tickets()) {
            String seat = ticket.seatNumber() == null ? ticket.ticketType()
                    : "Section " + ticket.seatSection() + ", Row " + ticket.seatRow() + ", Seat " + ticket.seatNumber();
            rows.append("<tr><td style=\"padding:10px;border-bottom:1px solid #eee\"><strong>")
                    .append(escape(ticket.eventName())).append("</strong><br>")
                    .append(escape(ticket.eventStart())).append("<br>")
                    .append(escape(ticket.venue())).append("</td><td style=\"padding:10px;border-bottom:1px solid #eee\">")
                    .append(escape(seat)).append("</td></tr>");
        }
        return "<html><body style=\"font-family:Arial,sans-serif;max-width:640px;margin:auto\"><h2>Your tickets are ready</h2>"
                + "<p>Hi " + escape(manifest.recipientName()) + ",</p><p>Your order <strong>"
                + escape(manifest.orderNumber()) + "</strong> is confirmed. Each purchased ticket is attached as a PDF.</p>"
                + "<table style=\"width:100%;border-collapse:collapse\">" + rows + "</table>"
                + "<p>Present the QR code in each attachment at entry.</p></body></html>";
    }

    private static String value(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return value == null ? "" : value.toString();
    }

    private static String sanitizeSubject(String value) { return value.replace("\r", " ").replace("\n", " ").trim(); }

    private static String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }

    public static class NotificationProcessingException extends Exception {
        public NotificationProcessingException(String message, Throwable cause) { super(message, cause); }
    }
}
