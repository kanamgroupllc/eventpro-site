package com.accessplus.eventpro.api.config;

import com.accessplus.eventpro.order.order.config.PlatformFeeProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

/**
 * Provides platform fee rates at order creation. We use 0 here because actual fees
 * are tier-based (Basic 3.5%+$0.99, Pro 2.9%+$0.79, Enterprise 2.5%+$0.49) and computed
 * per organizer at report time (dashboard, 1099-K). Order-level platform_fee is left 0.
 */
@Configuration
public class PlatformFeeConfig {

    @Bean
    public PlatformFeeProvider platformFeeProvider() {
        return new PlatformFeeProvider() {
            @Override
            public double getFeePercent() { return 0; }
            @Override
            public BigDecimal getFeePerTicket() { return BigDecimal.ZERO; }
        };
    }
}
