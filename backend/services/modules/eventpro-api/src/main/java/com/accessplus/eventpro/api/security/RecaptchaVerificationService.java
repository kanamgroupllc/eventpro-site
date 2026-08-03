package com.accessplus.eventpro.api.security;

import com.accessplus.eventpro.api.config.RecaptchaProperties;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Verifies Google reCAPTCHA tokens (v3 preferred: score + action).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecaptchaVerificationService {

    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    private final RecaptchaProperties properties;
    private final ObjectMapper objectMapper;

    private final RestClient restClient = RestClient.builder().build();

    /**
     * @param token        token from grecaptcha.execute (v3) or v2 callback
     * @param remoteIp     client IP (optional; forwarded for Google risk analysis)
     * @param expectedAction v3 action name (e.g. login, checkout); if null, action is not checked
     */
    public void verify(String token, String remoteIp, String expectedAction) {
        if (!properties.isEnabled()) {
            return;
        }
        String secret = properties.getSecretKey();
        if (secret == null || secret.isBlank()) {
            log.warn("reCAPTCHA is enabled but eventpro.recaptcha.secret-key is empty; skipping verification");
            return;
        }
        if (token == null || token.isBlank()) {
            throw new ValidationException("reCAPTCHA verification required");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", secret.trim());
        form.add("response", token.trim());
        if (remoteIp != null && !remoteIp.isBlank()) {
            form.add("remoteip", remoteIp.trim());
        }

        String raw;
        try {
            raw = restClient.post()
                    .uri(VERIFY_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.error("reCAPTCHA siteverify request failed: {}", e.getMessage());
            throw new ValidationException("reCAPTCHA verification service unavailable");
        }

        if (raw == null || raw.isBlank()) {
            throw new ValidationException("reCAPTCHA verification failed");
        }

        try {
            JsonNode node = objectMapper.readTree(raw);
            if (!node.path("success").asBoolean(false)) {
                log.warn("reCAPTCHA success=false: {}", raw.length() > 500 ? raw.substring(0, 500) : raw);
                throw new ValidationException("reCAPTCHA verification failed");
            }
            if (node.has("score") && !node.get("score").isNull()) {
                double score = node.get("score").asDouble();
                if (score < properties.getMinScore()) {
                    log.warn("reCAPTCHA score too low: {}", score);
                    throw new ValidationException("reCAPTCHA score too low");
                }
            }
            if (expectedAction != null && !expectedAction.isBlank() && node.has("action") && !node.get("action").isNull()) {
                String act = node.get("action").asText();
                if (!expectedAction.equalsIgnoreCase(act)) {
                    log.warn("reCAPTCHA action mismatch: expected {} got {}", expectedAction, act);
                    throw new ValidationException("reCAPTCHA action mismatch");
                }
            }
        } catch (ValidationException e) {
            throw e;
        } catch (Exception e) {
            log.error("reCAPTCHA parse error: {}", e.getMessage());
            throw new ValidationException("reCAPTCHA verification failed");
        }
    }
}
