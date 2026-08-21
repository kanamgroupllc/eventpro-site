package com.accessplus.eventpro.notification.service.impl;

import com.accessplus.eventpro.notification.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@ConditionalOnProperty(name = "notifications.email.provider", havingValue = "log")
public class LoggingEmailService implements EmailService {
    private static final Logger LOG = LoggerFactory.getLogger(LoggingEmailService.class);

    @Override
    public String sendEmail(String to, String subject, String htmlBody, String textBody,
                            List<EmailAttachment> attachments, String idempotencyKey) {
        LOG.info("Captured email: to={}, subject={}, attachments={}, deliveryKey={}",
                to, subject, attachments == null ? 0 : attachments.size(), idempotencyKey);
        return "local-" + idempotencyKey;
    }
}
