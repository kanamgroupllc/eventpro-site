package com.accessplus.eventpro.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Sales tax configuration: default rate and optional per-state rates (US).
 * Used for jurisdiction-based tax at checkout; pass buyer state to checkout-totals.
 */
@Data
@Component
@ConfigurationProperties(prefix = "eventpro.tax")
public class TaxProperties {

    /** Fallback rate when no state or state not in map (0 = no tax). */
    private double defaultRate = 0;

    /** State code (e.g. CA, NY) -> rate percent. Empty or missing state uses defaultRate. */
    private Map<String, Double> ratesByState = new HashMap<>();

    public double getRateForState(String stateCode) {
        if (stateCode == null || stateCode.isBlank()) return defaultRate;
        String key = stateCode.trim().toUpperCase();
        return ratesByState.getOrDefault(key, defaultRate);
    }
}
