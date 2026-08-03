package com.accessplus.eventpro.api.payout.service;

import com.accessplus.eventpro.api.dto.OrganizerSummaryResponse;
import com.accessplus.eventpro.api.payout.dto.PayoutRequestResponse;
import com.accessplus.eventpro.api.payout.dto.RequestPayoutRequest;
import com.accessplus.eventpro.api.service.OrganizerService;
import com.accessplus.eventpro.api.payout.entity.PayoutRequestEntity;
import com.accessplus.eventpro.api.payout.repository.PayoutRequestRepository;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.payment.stripe.service.StripeService;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.stripe.exception.StripeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayoutRequestService {

    private final PayoutRequestRepository payoutRequestRepository;
    private final OrganizerService organizerService;
    private final UserRepository userRepository;
    private final StripeService stripeService;

    /**
     * Request a payout. Validates available balance and eligibility (verified, W-9 if required).
     * Creates a PENDING payout request; actual transfer is processed separately (e.g. Stripe Connect, manual).
     */
    @Transactional
    public PayoutRequestResponse requestPayout(UUID userId, RequestPayoutRequest request) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new ValidationException("User not found"));
        OrganizerSummaryResponse summary = organizerService.getOrganizerSummary(userId);

        if (!user.getIsVerified()) {
            throw new ValidationException("Complete Identity Check in Profile to request payouts.");
        }
        if (summary.getTotalRevenue() != null && summary.getTotalRevenue().compareTo(BigDecimal.valueOf(600)) >= 0
                && !summary.isW9Submitted()) {
            throw new ValidationException("Submit your W-9 in the Tax Center to request payouts (required at $600+ gross).");
        }

        BigDecimal available = summary.getAvailableBalance() != null ? summary.getAvailableBalance() : BigDecimal.ZERO;
        BigDecimal amount = request.getAmount();
        if (amount.compareTo(available) > 0) {
            throw new ValidationException("Amount exceeds available balance (" + available + ").");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Amount must be greater than 0.");
        }

        PayoutRequestEntity entity = new PayoutRequestEntity();
        entity.setUserId(userId);
        entity.setAmount(amount);
        entity.setStatus("PENDING");
        entity.setRequestedAt(java.time.Instant.now());
        entity = payoutRequestRepository.save(entity);

        String connectAccountId = user.getStripeConnectAccountId();
        if (connectAccountId != null && !connectAccountId.isBlank()) {
            try {
                stripeService.createTransferToConnectAccount(amount, connectAccountId, "usd");
                entity.setStatus("COMPLETED");
                entity.setCompletedAt(Instant.now());
                entity = payoutRequestRepository.save(entity);
                log.info("Payout completed via Stripe Connect: userId={}, amount={}, requestId={}", userId, amount, entity.getId());
            } catch (StripeException e) {
                log.warn("Stripe Transfer failed for payout request {}: {}", entity.getId(), e.getMessage());
                // Leave as PENDING; support can retry or process manually
            }
        } else {
            log.info("Payout requested (no Connect account): userId={}, amount={}, requestId={}. Add bank account to enable instant payouts.", userId, amount, entity.getId());
        }

        return toResponse(entity);
    }

    public Page<PayoutRequestResponse> getPayoutRequests(UUID userId, Pageable pageable) {
        return payoutRequestRepository.findByUserIdOrderByRequestedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    private PayoutRequestResponse toResponse(PayoutRequestEntity e) {
        return PayoutRequestResponse.builder()
                .id(e.getId())
                .amount(e.getAmount())
                .status(e.getStatus())
                .requestedAt(e.getRequestedAt())
                .completedAt(e.getCompletedAt())
                .build();
    }
}
