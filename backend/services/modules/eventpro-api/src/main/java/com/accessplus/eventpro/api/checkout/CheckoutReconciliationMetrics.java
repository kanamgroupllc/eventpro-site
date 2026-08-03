package com.accessplus.eventpro.api.checkout;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Component
@RequiredArgsConstructor
public class CheckoutReconciliationMetrics {
    private final JdbcTemplate jdbc;
    private final MeterRegistry registry;
    private final Map<String, AtomicLong> gauges = new LinkedHashMap<>();

    @PostConstruct
    void register() {
        register("eventpro.inventory.orphan_reservations");
        register("eventpro.inventory.expired_holds");
        register("eventpro.inventory.cart_ticket_mismatches");
        register("eventpro.checkout.duplicate_payment_order_links");
        register("eventpro.checkout.refund_pending");
        register("eventpro.checkout.outbox_retries");
    }

    private void register(String name) {
        AtomicLong value = new AtomicLong();
        gauges.put(name, value);
        registry.gauge(name, value);
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void reconcile() {
        try {
            set("eventpro.inventory.orphan_reservations", """
                    SELECT COUNT(*) FROM tickets t
                    WHERE t.ticket_status = 'RESERVED'
                      AND NOT EXISTS (SELECT 1 FROM carts c WHERE c.ticket_id = t.id)
                      AND NOT EXISTS (
                        SELECT 1 FROM checkout_session_tickets st
                        JOIN checkout_sessions s ON s.id = st.checkout_session_id
                        WHERE st.ticket_id = t.id AND s.status = 'PENDING')
                    """);
            set("eventpro.inventory.expired_holds", "SELECT COUNT(*) FROM tickets WHERE ticket_status = 'RESERVED' AND (reserved_until IS NULL OR reserved_until <= CURRENT_TIMESTAMP)");
            set("eventpro.inventory.cart_ticket_mismatches", """
                    SELECT COUNT(*) FROM carts c JOIN tickets t ON t.id = c.ticket_id
                    WHERE c.quantity <> 1 OR t.ticket_status <> 'RESERVED'
                    """);
            set("eventpro.checkout.duplicate_payment_order_links", """
                    SELECT COUNT(*) FROM (
                      SELECT payment_intent_id FROM orders WHERE payment_intent_id IS NOT NULL
                      GROUP BY payment_intent_id HAVING COUNT(*) > 1
                    ) duplicates
                    """);
            set("eventpro.checkout.refund_pending", "SELECT COUNT(*) FROM checkout_sessions WHERE status = 'REFUND_PENDING'");
            set("eventpro.checkout.outbox_retries", "SELECT COUNT(*) FROM checkout_outbox_events WHERE status = 'PENDING' AND attempts > 0");
        } catch (RuntimeException e) {
            log.warn("Checkout reconciliation metrics refresh failed", e);
        }
    }

    private void set(String metric, String sql) {
        Long value = jdbc.queryForObject(sql, Long.class);
        gauges.get(metric).set(value == null ? 0 : value);
    }
}
