package com.accessplus.eventpro.notification.service;

public interface EmailService {
    String sendEmail(String to, String subject, String htmlBody, String textBody,
                     java.util.List<EmailAttachment> attachments, String idempotencyKey);

    record EmailAttachment(String filename, String contentType, byte[] content) {
        public EmailAttachment(String filename, byte[] content) {
            this(filename, "application/pdf", content);
        }
    }
}
