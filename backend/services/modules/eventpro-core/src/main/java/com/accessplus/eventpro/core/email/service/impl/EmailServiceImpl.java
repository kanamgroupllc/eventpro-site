package com.accessplus.eventpro.core.email.service.impl;

import com.accessplus.eventpro.core.email.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

import java.math.BigDecimal;
import java.net.URI;

/**
 * Implementation of EmailService using AWS SES.
 */
@Slf4j
@Service
public class EmailServiceImpl implements EmailService {
    
    @Value("${aws.ses.region:us-east-1}")
    private String awsRegion;
    
    @Value("${aws.ses.fromEmail:noreply@kanamevents.com}")
    private String fromEmail;

    @Value("${aws.ses.endpoint:}")
    private String sesEndpoint; // Optional: for LocalStack (e.g. http://localhost:4566)
    
    private SesClient sesClient;
    
    private SesClient getSesClient() {
        if (sesClient == null) {
            var builder = SesClient.builder()
                    .region(Region.of(awsRegion))
                    .credentialsProvider(DefaultCredentialsProvider.builder().build());
            if (sesEndpoint != null && !sesEndpoint.isEmpty()) {
                builder.endpointOverride(URI.create(sesEndpoint));
            }
            sesClient = builder.build();
        }
        return sesClient;
    }
    
    @Override
    public void sendPasswordResetConfirmation(String email, String code) throws Exception {
        log.info("Sending password reset confirmation email to: {}", email);
        
        try {
            String subject = "Password Reset Confirmation - KanamEvents";
            String bodyText = String.format(
                    "Your password has been successfully reset.\n\n" +
                    "Verification Code: %s\n\n" +
                    "If you did not request this password reset, please contact support immediately.\n\n" +
                    "Thank you,\n" +
                    "KanamEvents Team",
                    code
            );
            
            String bodyHtml = String.format(
                    "<html><body>" +
                    "<h2>Password Reset Confirmation</h2>" +
                    "<p>Your password has been successfully reset.</p>" +
                    "<p><strong>Verification Code:</strong> %s</p>" +
                    "<p>If you did not request this password reset, please contact support immediately.</p>" +
                    "<p>Thank you,<br>KanamEvents Team</p>" +
                    "</body></html>",
                    code
            );
            
            SendEmailRequest emailRequest = SendEmailRequest.builder()
                    .source(fromEmail)
                    .destination(Destination.builder()
                            .toAddresses(email)
                            .build())
                    .message(Message.builder()
                            .subject(Content.builder()
                                    .data(subject)
                                    .charset("UTF-8")
                                    .build())
                            .body(Body.builder()
                                    .text(Content.builder()
                                            .data(bodyText)
                                            .charset("UTF-8")
                                            .build())
                                    .html(Content.builder()
                                            .data(bodyHtml)
                                            .charset("UTF-8")
                                            .build())
                                    .build())
                            .build())
                    .build();
            
            SendEmailResponse response = getSesClient().sendEmail(emailRequest);
            log.info("Password reset confirmation email sent successfully. MessageId: {}", response.messageId());
            
        } catch (SesException e) {
            log.error("Failed to send password reset confirmation email: {}", e.getMessage(), e);
            throw new Exception("Failed to send email: " + e.getMessage(), e);
        }
    }

    @Override
    public void sendOrderConfirmation(String toEmail, String recipientName, String orderNumber,
                                      String eventName, BigDecimal totalAmount) throws Exception {
        log.info("Sending order confirmation email to: {}, orderNumber={}", toEmail, orderNumber);

        String displayName = (recipientName != null && !recipientName.isBlank()) ? recipientName : "Guest";
        String eventLabel = (eventName != null && !eventName.isBlank()) ? eventName : "Your event";
        String totalStr = totalAmount != null ? String.format("%.2f", totalAmount) : "0.00";

        String subject = "Your tickets are confirmed – " + eventLabel;
        String bodyText = String.format(
                "Hi %s,\n\n" +
                "Your order is confirmed. Thank you for your purchase!\n\n" +
                "Order number: %s\n" +
                "Event: %s\n" +
                "Total: $%s\n\n" +
                "You can view and manage your tickets in the KanamEvents app or by logging into your account.\n\n" +
                "Thank you,\n" +
                "KanamEvents Team",
                displayName, orderNumber, eventLabel, totalStr
        );
        String bodyHtml = String.format(
                "<html><body style=\"font-family: sans-serif; max-width: 600px;\">" +
                "<h2 style=\"color: #333;\">Your tickets are confirmed</h2>" +
                "<p>Hi %s,</p>" +
                "<p>Your order is confirmed. Thank you for your purchase!</p>" +
                "<table style=\"border-collapse: collapse; margin: 1em 0;\">" +
                "<tr><td style=\"padding: 6px 12px 6px 0; color: #666;\">Order number</td><td style=\"padding: 6px 0;\"><strong>%s</strong></td></tr>" +
                "<tr><td style=\"padding: 6px 12px 6px 0; color: #666;\">Event</td><td style=\"padding: 6px 0;\">%s</td></tr>" +
                "<tr><td style=\"padding: 6px 12px 6px 0; color: #666;\">Total</td><td style=\"padding: 6px 0;\">$%s</td></tr>" +
                "</table>" +
                "<p>You can view and manage your tickets in the KanamEvents app or by logging into your account.</p>" +
                "<p>Thank you,<br>KanamEvents Team</p>" +
                "</body></html>",
                escapeHtml(displayName), escapeHtml(orderNumber), escapeHtml(eventLabel), totalStr
        );

        try {
            SendEmailRequest emailRequest = SendEmailRequest.builder()
                    .source(fromEmail)
                    .destination(Destination.builder().toAddresses(toEmail).build())
                    .message(Message.builder()
                            .subject(Content.builder().data(subject).charset("UTF-8").build())
                            .body(Body.builder()
                                    .text(Content.builder().data(bodyText).charset("UTF-8").build())
                                    .html(Content.builder().data(bodyHtml).charset("UTF-8").build())
                                    .build())
                            .build())
                    .build();
            SendEmailResponse response = getSesClient().sendEmail(emailRequest);
            log.info("Order confirmation email sent: to={}, orderNumber={}, messageId={}", toEmail, orderNumber, response.messageId());
        } catch (SesException e) {
            log.error("Failed to send order confirmation email: {}", e.getMessage(), e);
            throw new Exception("Failed to send email: " + e.getMessage(), e);
        }
    }

    @Override
    public void sendCustomEmail(String toEmail, String subject, String bodyText, String bodyHtml) throws Exception {
        if (toEmail == null || toEmail.isBlank()) {
            throw new IllegalArgumentException("Recipient email is required");
        }
        String text = bodyText != null ? bodyText : "";
        String html = bodyHtml != null && !bodyHtml.isBlank() ? bodyHtml : "<html><body><pre>" + escapeHtml(text) + "</pre></body></html>";
        String subj = subject != null && !subject.isBlank() ? subject : "Message from KanamEvents";
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                    .source(fromEmail)
                    .destination(Destination.builder().toAddresses(toEmail).build())
                    .message(Message.builder()
                            .subject(Content.builder().data(subj).charset("UTF-8").build())
                            .body(Body.builder()
                                    .text(Content.builder().data(text).charset("UTF-8").build())
                                    .html(Content.builder().data(html).charset("UTF-8").build())
                                    .build())
                            .build())
                    .build();
            getSesClient().sendEmail(request);
            log.info("Custom email sent: to={}, subject={}", toEmail, subj);
        } catch (SesException e) {
            log.error("Failed to send custom email: {}", e.getMessage(), e);
            throw new Exception("Failed to send email: " + e.getMessage(), e);
        }
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
