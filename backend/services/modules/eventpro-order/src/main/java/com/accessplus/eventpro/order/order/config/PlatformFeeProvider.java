package com.accessplus.eventpro.order.order.config;

import java.math.BigDecimal;

/**
 * Provides platform fee rates for new orders: percentage of order total and/or flat fee per ticket.
 * When not provided (e.g. tests), fees are treated as 0. eventpro-api provides a bean from config.
 */
public interface PlatformFeeProvider {

    /**
     * Platform fee as a percentage of order total (e.g. 5 = 5%). 0 means no percentage fee.
     */
    double getFeePercent();

    /**
     * Flat fee per ticket sold (e.g. 0.50 = $0.50 per ticket). Zero means no per-ticket fee.
     */
    BigDecimal getFeePerTicket();
}
