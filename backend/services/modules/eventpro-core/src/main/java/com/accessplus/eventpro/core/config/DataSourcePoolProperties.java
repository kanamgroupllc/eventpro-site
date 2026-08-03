package com.accessplus.eventpro.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "eventpro.datasource.hikari")
public class DataSourcePoolProperties {

    /** Max pool size (default 10 local; set higher in prod, e.g. 20, so tasks × pool ≤ RDS max_connections). */
    private int maximumPoolSize = 10;

    private int minimumIdle = 2;

    private long connectionTimeoutMs = 30_000L;

    private long idleTimeoutMs = 600_000L;

    private long maxLifetimeMs = 1_800_000L;

    private long validationTimeoutMs = 5_000L;

    /** Leak detection (0 = disabled). Non-local defaults to 60s. */
    private long leakDetectionThresholdMs = 0L;
}
