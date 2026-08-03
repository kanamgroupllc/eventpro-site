package com.accessplus.eventpro.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * API exposure controls for production hardening (Swagger, actuator metrics).
 */
@Data
@ConfigurationProperties(prefix = "eventpro.security.api")
public class EventProApiSecurityProperties {

    /** When false, Swagger/OpenAPI requires authentication (recommended for production). */
    private boolean publicSwagger = true;

    /** When true, /actuator/prometheus and /actuator/metrics are public (not recommended). */
    private boolean publicActuatorMetrics = false;
}
