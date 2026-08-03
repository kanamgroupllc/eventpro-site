package com.accessplus.eventpro.api.checkout;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.time.LocalDateTime;

public interface CheckoutSessionRepository extends JpaRepository<CheckoutSessionEntity, UUID> {
    Optional<CheckoutSessionEntity> findByIdempotencyKey(String idempotencyKey);
    Optional<CheckoutSessionEntity> findByResumeTokenHash(String resumeTokenHash);
    Optional<CheckoutSessionEntity> findByPaymentIntentId(String paymentIntentId);
    boolean existsByUserIdAndStatus(UUID userId, CheckoutSessionStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM CheckoutSessionEntity s WHERE s.id = :id")
    Optional<CheckoutSessionEntity> findByIdForUpdate(@Param("id") UUID id);

    @Query(value = "SELECT * FROM checkout_sessions WHERE status = 'PENDING' AND expires_at <= :before " +
            "ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED", nativeQuery = true)
    List<CheckoutSessionEntity> findDueForExpiry(@Param("before") LocalDateTime before);
}
