package com.accessplus.eventpro.notification.service.impl;

import com.accessplus.eventpro.notification.config.SESConfig;
import com.accessplus.eventpro.notification.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.Body;
import software.amazon.awssdk.services.ses.model.Content;
import software.amazon.awssdk.services.ses.model.Destination;
import software.amazon.awssdk.services.ses.model.Message;
import software.amazon.awssdk.services.ses.model.SendEmailRequest;
import software.amazon.awssdk.services.ses.model.SesException;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger LOG = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final SesClient sesClient;
    private final SESConfig sesConfig;

    public EmailServiceImpl(SesClient sesClient, SESConfig sesConfig) {
        this.sesClient = sesClient;
        this.sesConfig = sesConfig;
    }

    @Override
    public void sendEmail(String to, String subject, String htmlBody, String textBody) {
        LOG.debug("Sending email to: {}, subject: {}", to, subject);

        try {
            SendEmailRequest sendEmailRequest = SendEmailRequest.builder()
                    .destination(Destination.builder().toAddresses(to).build())
                    .message(Message.builder()
                            .subject(Content.builder().data(subject).build())
                            .body(Body.builder()
                                    .html(Content.builder().data(htmlBody).build())
                                    .text(Content.builder().data(textBody).build())
                                    .build())
                            .build())
                    .source(sesConfig.getSenderEmail())
                    .build();

            sesClient.sendEmail(sendEmailRequest);
            LOG.info("Email sent successfully to: {}", to);
        } catch (SesException e) {
            LOG.error("Failed to send email to {}: {}", to, e.getMessage(), e);
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }
}
