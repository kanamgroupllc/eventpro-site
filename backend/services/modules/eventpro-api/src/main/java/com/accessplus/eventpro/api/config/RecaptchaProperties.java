package com.accessplus.eventpro.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Google reCAPTCHA v3 (recommended) or v2. When {@code enabled} is true, protected endpoints require a valid token.
 * Set {@code secret-key} from Google Admin; optional {@code site-key} is exposed via GET /api/v1/payments/config for SPAs.
 */
@Data
@ConfigurationProperties(prefix = "eventpro.recaptcha")
public class RecaptchaProperties {

    private boolean enabled = false;

    /** Server-side secret (RECAPTCHA_SECRET_KEY). */
    private String secretKey = "";

    /** Public site key returned to the frontend when configured (optional; can use VITE_RECAPTCHA_SITE_KEY only). */
    private String siteKey = "";

    /** Minimum v3 score (0.0–1.0). Ignored for v2 responses (no score). */
    private double minScore = 0.5;
}
