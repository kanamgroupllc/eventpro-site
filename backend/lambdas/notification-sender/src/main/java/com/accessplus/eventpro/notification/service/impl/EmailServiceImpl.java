package com.accessplus.eventpro.notification.service.impl;

import com.accessplus.eventpro.notification.service.EmailService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "notifications.email.provider", havingValue = "resend", matchIfMissing = true)
public class EmailServiceImpl implements EmailService {
    private final SecretsManagerClient secretsManager;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String directApiKey;
    private final String secretArn;
    private final String from;
    private final String replyTo;
    private final URI endpoint;
    private volatile String cachedApiKey;

    public EmailServiceImpl(SecretsManagerClient secretsManager, ObjectMapper objectMapper,
                            @Value("${resend.api-key:}") String directApiKey,
                            @Value("${resend.api-key-secret-arn:}") String secretArn,
                            @Value("${resend.from}") String from,
                            @Value("${resend.reply-to}") String replyTo,
                            @Value("${resend.endpoint}") String endpoint) {
        this.secretsManager = secretsManager;
        this.objectMapper = objectMapper;
        this.directApiKey = directApiKey;
        this.secretArn = secretArn;
        this.from = from;
        this.replyTo = replyTo;
        this.endpoint = URI.create(endpoint);
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        if ((directApiKey == null || directApiKey.isBlank()) && (secretArn == null || secretArn.isBlank())) {
            throw new IllegalStateException("Resend requires RESEND_API_KEY_SECRET_ARN or a local RESEND_API_KEY");
        }
    }

    @Override
    public String sendEmail(String to, String subject, String htmlBody, String textBody,
                            List<EmailAttachment> attachments, String idempotencyKey) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("from", from);
            body.put("to", List.of(to));
            body.put("reply_to", replyTo);
            body.put("subject", subject);
            body.put("html", htmlBody);
            body.put("text", textBody);
            if (attachments != null && !attachments.isEmpty()) {
                List<Map<String, String>> encoded = new ArrayList<>();
                for (EmailAttachment attachment : attachments) {
                    encoded.add(Map.of(
                            "filename", attachment.filename(),
                            "content_type", attachment.contentType(),
                            "content", Base64.getEncoder().encodeToString(attachment.content())));
                }
                body.put("attachments", encoded);
            }

            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(30))
                    .header("Authorization", "Bearer " + apiKey())
                    .header("Content-Type", "application/json")
                    .header("Idempotency-Key", idempotencyKey)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(objectMapper.writeValueAsBytes(body)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new EmailDeliveryException("Resend returned HTTP " + response.statusCode(),
                        response.statusCode() == 429 || response.statusCode() >= 500);
            }
            JsonNode json = objectMapper.readTree(response.body());
            String id = json.path("id").asText();
            if (id.isBlank()) throw new EmailDeliveryException("Resend response did not contain an email ID", true);
            return id;
        } catch (EmailDeliveryException error) {
            throw error;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new EmailDeliveryException("Resend request was interrupted", true, error);
        } catch (Exception error) {
            throw new EmailDeliveryException("Unable to submit email to Resend", true, error);
        }
    }

    private String apiKey() throws Exception {
        if (cachedApiKey != null) return cachedApiKey;
        synchronized (this) {
            if (cachedApiKey != null) return cachedApiKey;
            if (directApiKey != null && !directApiKey.isBlank()) {
                cachedApiKey = directApiKey.trim();
            } else {
                String secret = secretsManager.getSecretValue(GetSecretValueRequest.builder().secretId(secretArn).build()).secretString();
                JsonNode json;
                try {
                    json = objectMapper.readTree(secret);
                } catch (Exception invalidSecret) {
                    throw new IllegalStateException("Resend secret is not valid JSON");
                }
                cachedApiKey = json.path("apiKey").asText().trim();
                if (cachedApiKey.isBlank()) throw new IllegalStateException("Resend secret is missing apiKey");
            }
            return cachedApiKey;
        }
    }

    public static class EmailDeliveryException extends RuntimeException {
        private final boolean retryable;
        public EmailDeliveryException(String message, boolean retryable) { super(message); this.retryable = retryable; }
        public EmailDeliveryException(String message, boolean retryable, Throwable cause) { super(message, cause); this.retryable = retryable; }
        public boolean isRetryable() { return retryable; }
    }
}
