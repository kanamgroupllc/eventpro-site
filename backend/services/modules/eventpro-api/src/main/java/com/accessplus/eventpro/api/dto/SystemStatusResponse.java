package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight JVM + DB health for admin dashboard (not a full observability stack).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemStatusResponse {
    /** UP or DEGRADED */
    private String overallStatus;
    private String databaseStatus;
    /** Heap used in MB */
    private long heapUsedMb;
    /** Max heap in MB */
    private long heapMaxMb;
    private int heapUsagePercent;
    private String javaVersion;
    private String osName;
}
