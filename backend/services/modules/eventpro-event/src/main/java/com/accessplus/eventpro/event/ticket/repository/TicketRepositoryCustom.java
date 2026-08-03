package com.accessplus.eventpro.event.ticket.repository;

import com.accessplus.eventpro.shared.enums.TicketType;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Atomic reserve-one-ticket for high contention: one request wins, others get nothing instantly.
 * Uses SELECT ... FOR UPDATE SKIP LOCKED so the DB picks one row without blocking 99,999 others.
 */
public interface TicketRepositoryCustom {

    /**
     * Locks one available ticket row (FOR UPDATE SKIP LOCKED), updates it to RESERVED with reserved_until,
     * and returns its ID. Only one concurrent caller per available ticket can win; others get empty.
     *
     * @param eventId       event
     * @param ticketType    ticket type
     * @param reservedUntil when the hold expires (e.g. now + 10 min)
     * @return reserved ticket ID, or empty if none available (instant rejection)
     */
    Optional<UUID> reserveOneTicketAtomic(UUID eventId, TicketType ticketType, LocalDateTime reservedUntil);
}
