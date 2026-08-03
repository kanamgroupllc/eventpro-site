package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Organizer dashboard summary: events hosted, tickets sold, optional trend and financial state.
 * Used for Profile "Your Impact" and Organizer page.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerSummaryResponse {

    private long eventsHosted;
    private long ticketsSold;
    /** Percent change in tickets sold this week vs last week; null if not computed. */
    private Integer ticketsSoldTrendPercent;
    /** Life-to-date total revenue from paid orders for organizer's events (gross). */
    private BigDecimal totalRevenue;
    /** Platform fees withheld from ticket sales (tier-based: Basic 3.5%+$0.99, Pro 2.9%+$0.79, Enterprise 2.5%+$0.49). */
    private BigDecimal platformFeesWithheld;
    /** Fee rate for current plan, e.g. "2.9% + $0.79 per ticket (Pro)". */
    private String platformFeeRateLabel;
    /** Available for payout (gross revenue minus platform fees). */
    private BigDecimal availableBalance;
    /** Pending balance (net from sales in the hold window). */
    private BigDecimal pendingBalance;
    /** Hold window in days (e.g. 3); revenue from last N days is "pending". */
    private Integer pendingHoldDays;
    /** When true, show "Review Required" and disable payouts (risk scoring). */
    private boolean riskFlagged;
    /** Risk level: LOW, MEDIUM, HIGH (for "High Risk" warning on Profile). */
    private String riskLevel;
    /** True when organizer has submitted W-9 for 1099-K compliance. */
    private boolean w9Submitted;
    /** Payout options available by tier and risk: T+2, 50% early, 100% instant. */
    private PayoutEligibilityDto payoutEligibility;
}
