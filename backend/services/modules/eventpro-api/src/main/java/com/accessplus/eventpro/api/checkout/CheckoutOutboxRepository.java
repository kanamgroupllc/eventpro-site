package com.accessplus.eventpro.api.checkout;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.*;

public interface CheckoutOutboxRepository extends JpaRepository<CheckoutOutboxEventEntity, UUID> {
    @Query(value = "SELECT * FROM checkout_outbox_events WHERE status = 'PENDING' AND next_attempt_at <= :before " +
            "ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED", nativeQuery = true)
    List<CheckoutOutboxEventEntity> findDue(@Param("before") LocalDateTime before);
}
