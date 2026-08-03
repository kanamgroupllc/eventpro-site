package com.accessplus.eventpro.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Browser CSRF protection settings.
 */
@Data
@ConfigurationProperties(prefix = "eventpro.security.csrf")
public class EventProCsrfProperties {

    /** Emergency rollout control. CSRF should remain enabled outside a planned transition. */
    private boolean enabled = true;

    /** Force the CSRF cookie to HTTPS-only in deployed environments. */
    private boolean secureCookie = true;

    /** SameSite policy for the host-only CSRF cookie. */
    private String sameSite = "Strict";
}
