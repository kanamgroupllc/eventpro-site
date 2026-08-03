package com.accessplus.eventpro.api.service;

import com.accessplus.eventpro.api.dto.SystemStatusResponse;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * JVM + DB snapshot for admin health UI. Cached briefly to avoid hammering the DB and repeated heap walks under load.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemStatusAggregatorService {

    private static final long CACHE_TTL_MS = 30_000;

    private final UserRepository userRepository;

    private volatile CacheEntry cache;

    public SystemStatusResponse getStatus() {
        long now = System.currentTimeMillis();
        CacheEntry c = cache;
        if (c != null && now - c.timestamp < CACHE_TTL_MS) {
            return c.value;
        }
        synchronized (this) {
            c = cache;
            if (c != null && now - c.timestamp < CACHE_TTL_MS) {
                return c.value;
            }
            SystemStatusResponse v = compute();
            cache = new CacheEntry(v, System.currentTimeMillis());
            return v;
        }
    }

    private SystemStatusResponse compute() {
        Runtime rt = Runtime.getRuntime();
        long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024L * 1024L);
        long maxMb = rt.maxMemory() / (1024L * 1024L);
        int pct = maxMb > 0 ? (int) Math.min(100, (usedMb * 100 / maxMb)) : 0;
        String db = "UP";
        try {
            userRepository.count();
        } catch (Exception ex) {
            log.warn("DB health check failed", ex);
            db = "DOWN";
        }
        String overall = "UP".equals(db) ? "Operational" : "Degraded";
        return SystemStatusResponse.builder()
                .overallStatus(overall)
                .databaseStatus(db)
                .heapUsedMb(usedMb)
                .heapMaxMb(maxMb)
                .heapUsagePercent(pct)
                .javaVersion(System.getProperty("java.version", "?"))
                .osName(System.getProperty("os.name", "?"))
                .build();
    }

    private record CacheEntry(SystemStatusResponse value, long timestamp) {}
}
