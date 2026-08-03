package com.accessplus.eventpro.api.service;

import java.util.UUID;

/**
 * Placeholder for OFAC (or other watchlist) check on KYC submission.
 * Implement with a real provider (e.g. OFAC SDN list, ComplyAdvantage) and call from
 * verification post-submit flow to auto-approve or auto-reject.
 */
public interface OfacCheckService {

    enum Result {
        PASS,
        FAIL
    }

    /**
     * Run watchlist check on the given identity data. Stub implementation returns PASS.
     * When integrated: call provider API, return FAIL with reason if match found.
     */
    Result check(UUID userId, String fullName, String dateOfBirth, String addressLine, String city, String state, String zip, String country);
}
