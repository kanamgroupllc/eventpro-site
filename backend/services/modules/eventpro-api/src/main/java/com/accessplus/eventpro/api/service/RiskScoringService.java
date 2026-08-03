package com.accessplus.eventpro.api.service;

import java.util.UUID;

/**
 * Computes and persists organizer risk level (LOW, MEDIUM, HIGH) from KYC, history, and ticket price band.
 * Used to gate 50% early (Pro) and 100% instant (Enterprise) payouts.
 */
public interface RiskScoringService {

    /**
     * Recomputes risk level for the organizer and updates the user record.
     *
     * @param organizerId the user (organizer) id
     * @return the new risk level: LOW, MEDIUM, or HIGH
     */
    String computeAndUpdateRiskScore(UUID organizerId);
}
