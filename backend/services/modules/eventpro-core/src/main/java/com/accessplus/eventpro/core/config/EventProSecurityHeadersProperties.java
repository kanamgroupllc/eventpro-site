package com.accessplus.eventpro.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "eventpro.security")
public class EventProSecurityHeadersProperties {

    private boolean hstsEnabled = false;
}
