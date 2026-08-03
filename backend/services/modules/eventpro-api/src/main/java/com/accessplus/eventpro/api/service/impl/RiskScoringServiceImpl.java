package com.accessplus.eventpro.api.service.impl;

import com.accessplus.eventpro.api.service.RiskScoringService;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Computes organizer risk level from KYC status, event history, and ticket price band.
 * Used to gate 50% early (Pro) and 100% instant (Enterprise) payouts.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RiskScoringServiceImpl implements RiskScoringService {

    private static final BigDecimal HIGH_TICKET_THRESHOLD = new BigDecimal("500");
    private static final BigDecimal MEDIUM_TICKET_THRESHOLD = new BigDecimal("200");

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final TicketRepository ticketRepository;

    @Override
    @Transactional
    public String computeAndUpdateRiskScore(UUID organizerId) {
        UserEntity user = userRepository.findById(organizerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", organizerId.toString()));

        List<EventEntity> events = eventRepository.findByOrganizerId(organizerId, PageRequest.of(0, Integer.MAX_VALUE)).getContent();
        List<UUID> eventIds = events.stream().map(EventEntity::getId).collect(Collectors.toList());

        BigDecimal maxTicketPrice = BigDecimal.ZERO;
        if (!eventIds.isEmpty()) {
            maxTicketPrice = ticketRepository.findMaxPriceByEventIds(eventIds).orElse(BigDecimal.ZERO);
        }

        String verificationStatus = user.getVerificationStatus() != null ? user.getVerificationStatus() : "NOT_STARTED";
        int eventsHosted = events.size();

        String newLevel = computeRiskLevel(verificationStatus, eventsHosted, maxTicketPrice);
        String previous = user.getRiskLevel();
        if (!newLevel.equals(previous)) {
            user.setRiskLevel(newLevel);
            userRepository.save(user);
            log.info("Updated risk score for organizer {}: {} -> {}", organizerId, previous, newLevel);
        }
        return newLevel;
    }

    /**
     * Rules: REJECTED KYC = HIGH; unverified + high-ticket = HIGH; unverified = MEDIUM;
     * no history = MEDIUM; high-ticket (500+) = MEDIUM; else LOW.
     */
    private String computeRiskLevel(String verificationStatus, int eventsHosted, BigDecimal maxTicketPrice) {
        if ("REJECTED".equalsIgnoreCase(verificationStatus)) {
            return "HIGH";
        }
        boolean verified = "VERIFIED".equalsIgnoreCase(verificationStatus);
        if (!verified) {
            if (maxTicketPrice.compareTo(MEDIUM_TICKET_THRESHOLD) > 0) {
                return "HIGH";
            }
            return "MEDIUM";
        }
        if (eventsHosted == 0) {
            return "MEDIUM";
        }
        if (maxTicketPrice.compareTo(HIGH_TICKET_THRESHOLD) > 0) {
            return "MEDIUM";
        }
        return "LOW";
    }
}
