package com.accessplus.eventpro.api.checkout;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CheckoutSessionTicketRepository extends JpaRepository<CheckoutSessionTicketEntity, UUID> {
    List<CheckoutSessionTicketEntity> findByCheckoutSessionIdOrderByCreatedAt(UUID checkoutSessionId);
}
