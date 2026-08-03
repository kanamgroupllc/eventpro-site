package com.accessplus.eventpro.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Platform fee by subscription tier. Must match the Pricing page:
 * Basic 3.5% + $0.99, Pro 2.9% + $0.79, Enterprise 2.5% + $0.49 per ticket.
 */
@Data
@Component
@ConfigurationProperties(prefix = "eventpro.platform.tiers")
public class PlatformTierFeeProperties {

    private TierFee basic = new TierFee(3.5, "0.99");
    private TierFee pro = new TierFee(2.9, "0.79");
    private TierFee enterprise = new TierFee(2.5, "0.49");

    @Data
    public static class TierFee {
        private double feePercent;
        private BigDecimal feePerTicket = BigDecimal.ZERO;

        public TierFee() {}

        public TierFee(double feePercent, String feePerTicket) {
            this.feePercent = feePercent;
            this.feePerTicket = new BigDecimal(feePerTicket);
        }
    }

    /** Returns fee percent for tier (BASIC, PRO, ENTERPRISE). Defaults to Basic if unknown. */
    public double getFeePercentForTier(String tier) {
        if (tier == null) return basic.getFeePercent();
        return switch (tier.toUpperCase()) {
            case "PRO" -> pro.getFeePercent();
            case "ENTERPRISE" -> enterprise.getFeePercent();
            default -> basic.getFeePercent();
        };
    }

    /** Returns fee per ticket for tier. Defaults to Basic if unknown. */
    public BigDecimal getFeePerTicketForTier(String tier) {
        if (tier == null) return basic.getFeePerTicket() != null ? basic.getFeePerTicket() : BigDecimal.ZERO;
        return switch (tier.toUpperCase()) {
            case "PRO" -> pro.getFeePerTicket() != null ? pro.getFeePerTicket() : BigDecimal.ZERO;
            case "ENTERPRISE" -> enterprise.getFeePerTicket() != null ? enterprise.getFeePerTicket() : BigDecimal.ZERO;
            default -> basic.getFeePerTicket() != null ? basic.getFeePerTicket() : BigDecimal.ZERO;
        };
    }
}
