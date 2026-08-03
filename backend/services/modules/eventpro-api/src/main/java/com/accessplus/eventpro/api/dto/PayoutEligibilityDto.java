package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payout options available to the organizer based on subscription tier and risk.
 * Basic: T+2 only. Pro: 50% early (if risk LOW/MEDIUM). Enterprise: 100% instant (if risk LOW).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayoutEligibilityDto {

    /** Standard payout: T+2 after event. Always true. */
    private boolean standardT2;
    /** Pro/Enterprise: 50% of funds released early (subject to risk). */
    private boolean early50Percent;
    /** Enterprise only: 100% instant payout (LOW risk). */
    private boolean instant100;
    /** Human-readable summary for UI, e.g. "Standard (T+2)" or "50% early available". */
    private String label;
}
