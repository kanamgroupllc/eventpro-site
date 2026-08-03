package com.accessplus.eventpro.api.subscription.repository;

import com.accessplus.eventpro.api.subscription.entity.SubscriptionPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPaymentEntity, UUID> {

    /**
     * Sum of subscription payments for the organizer in the given calendar year (for 1099-K "fees paid").
     */
    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM SubscriptionPaymentEntity s WHERE s.userId = :userId " +
           "AND s.paidAt >= :start AND s.paidAt < :end")
    BigDecimal sumAmountByUserIdAndPaidAtBetween(
            @Param("userId") UUID userId,
            @Param("start") Instant start,
            @Param("end") Instant end);
}
