package com.accessplus.eventpro.api.subscription.service.impl;

import com.accessplus.eventpro.api.subscription.entity.SubscriptionPaymentEntity;
import com.accessplus.eventpro.api.subscription.repository.SubscriptionPaymentRepository;
import com.accessplus.eventpro.api.subscription.service.SubscriptionPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionPaymentServiceImpl implements SubscriptionPaymentService {

    private final SubscriptionPaymentRepository subscriptionPaymentRepository;

    @Override
    @Transactional
    public SubscriptionPaymentEntity recordPayment(UUID userId, BigDecimal amount, String tier, String period) {
        return recordPayment(userId, amount, tier, period, Instant.now());
    }

    @Override
    @Transactional
    public SubscriptionPaymentEntity recordPayment(UUID userId, BigDecimal amount, String tier, String period, Instant paidAt) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount must be non-negative");
        }
        String tierNorm = tier != null ? tier.trim().toUpperCase() : "PRO";
        String periodNorm = (period != null && !period.isBlank()) ? period.trim().toUpperCase() : "MONTHLY";
        Instant at = paidAt != null ? paidAt : Instant.now();
        SubscriptionPaymentEntity entity = new SubscriptionPaymentEntity();
        entity.setUserId(userId);
        entity.setAmount(amount);
        entity.setPaidAt(at);
        entity.setTier(tierNorm);
        entity.setPeriod(periodNorm);
        entity = subscriptionPaymentRepository.save(entity);
        log.info("Recorded subscription payment: userId={}, amount={}, tier={}, period={}", userId, amount, tierNorm, periodNorm);
        return entity;
    }
}
