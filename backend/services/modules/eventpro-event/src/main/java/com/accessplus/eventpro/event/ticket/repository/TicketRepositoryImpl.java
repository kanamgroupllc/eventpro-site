package com.accessplus.eventpro.event.ticket.repository;

import com.accessplus.eventpro.shared.enums.TicketType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Atomic reserve-one: SELECT one row FOR UPDATE SKIP LOCKED, then UPDATE. One winner, rest get nothing.
 */
@Repository
public class TicketRepositoryImpl implements TicketRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Optional<UUID> reserveOneTicketAtomic(UUID eventId, TicketType ticketType, LocalDateTime reservedUntil) {
        // 1) Lock one available row (no wait: SKIP LOCKED). Other 99,999 get zero rows instantly.
        Query selectQuery = entityManager.createNativeQuery(
                "SELECT id FROM tickets " +
                        "WHERE event_id = CAST(:eventId AS uuid) AND ticket_type = :ticketType AND ticket_status = 'AVAILABLE' " +
                        "ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED");
        selectQuery.setParameter("eventId", eventId.toString());
        selectQuery.setParameter("ticketType", ticketType.name());
        @SuppressWarnings("unchecked")
        List<Object> rows = selectQuery.getResultList();
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        UUID id = toUuid(rows.get(0));
        if (id == null) {
            return Optional.empty();
        }
        // 2) Mark reserved (we hold the row lock until commit)
        Query updateQuery = entityManager.createNativeQuery(
                "UPDATE tickets SET ticket_status = 'RESERVED', reserved_until = :until WHERE id = CAST(:id AS uuid)");
        updateQuery.setParameter("until", reservedUntil);
        updateQuery.setParameter("id", id.toString());
        updateQuery.executeUpdate();
        return Optional.of(id);
    }

    private static UUID toUuid(Object value) {
        if (value == null) return null;
        if (value instanceof UUID) return (UUID) value;
        if (value instanceof String) return UUID.fromString((String) value);
        return UUID.fromString(value.toString());
    }
}
