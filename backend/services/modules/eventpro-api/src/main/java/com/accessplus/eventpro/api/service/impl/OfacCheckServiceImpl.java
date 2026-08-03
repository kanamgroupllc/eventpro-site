package com.accessplus.eventpro.api.service.impl;

import com.accessplus.eventpro.api.service.OfacCheckService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Stub OFAC/watchlist check. Returns PASS so admin review continues to drive VERIFIED/REJECTED.
 * Replace with real provider (OFAC SDN, ComplyAdvantage, etc.) when compliance is required.
 */
@Slf4j
@Service
public class OfacCheckServiceImpl implements OfacCheckService {

    @Override
    public Result check(UUID userId, String fullName, String dateOfBirth, String addressLine, String city, String state, String zip, String country) {
        log.debug("OFAC check (stub) for user {}: returning PASS. Integrate real provider for production.", userId);
        return Result.PASS;
    }
}
