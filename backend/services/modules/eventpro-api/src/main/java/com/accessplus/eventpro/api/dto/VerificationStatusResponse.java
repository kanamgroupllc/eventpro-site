package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Current KYC verification status for the organizer (Profile badge, payout gate).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationStatusResponse {

    /** NOT_STARTED, PENDING, IN_PROGRESS, VERIFIED, REJECTED. */
    private String verificationStatus;
    /** LOW, MEDIUM, HIGH. */
    private String riskLevel;
    /** Whether user can submit a new verification (e.g. after REJECTED). */
    private boolean canResubmit;
    /** Last submission timestamp, if any. */
    private Instant lastSubmittedAt;
    /** Reason for rejection when status is REJECTED (e.g. "Address doesn't match ID"). */
    private String lastRejectionReason;
}
