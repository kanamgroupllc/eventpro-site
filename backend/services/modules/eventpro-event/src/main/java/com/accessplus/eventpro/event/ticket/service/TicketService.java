package com.accessplus.eventpro.event.ticket.service;

import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface TicketService {

    List<TicketEntity> createTickets(
            UUID eventId,
            UUID creatorId,
            TicketType ticketType,
            BigDecimal price,
            int quantity,
            String name,
            LocalDateTime startTime,
            LocalDateTime endTime);

    TicketEntity updateTicket(
            UUID ticketId,
            String name,
            BigDecimal price,
            TicketType ticketType,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String printOutUrl);

    void deleteTicket(UUID ticketId);

    TicketEntity getTicketById(UUID ticketId);

    Page<TicketEntity> getTicketsByEvent(UUID eventId, Pageable pageable);

    Map<TicketType, List<TicketEntity>> groupTicketsByType(UUID eventId);

    Map<TicketType, Long> checkTicketAvailability(UUID eventId);

    TicketEntity markTicketAsSold(UUID ticketId, UUID purchaserId) throws java.io.IOException;

    /** Idempotently generates the QR artifact for an already-sold ticket. */
    TicketEntity issueTicketQr(UUID ticketId) throws java.io.IOException;

    void markTicketAsReserved(UUID ticketId);

    /** Reserves one specific ticket using an already-established cart/session deadline. */
    void markTicketAsReserved(UUID ticketId, LocalDateTime reservedUntil);

    void checkInTicket(UUID ticketId);

    void markTicketAsAvailable(UUID ticketId);

    /**
     * Atomically reserves exactly one ticket for the given event and type. Uses DB row lock
     * (FOR UPDATE SKIP LOCKED) so one request wins and all others get nothing instantly—no thundering herd.
     *
     * @param eventId    event
     * @param ticketType ticket type
     * @return reserved ticket ID, or empty if none available (instant rejection for high contention)
     */
    Optional<UUID> reserveOneTicketAtomic(UUID eventId, TicketType ticketType);

    /**
     * Finds up to {@code count} available tickets for the given event and type,
     * marks them as RESERVED (with expiry), and returns their IDs.
     * Prefer {@link #reserveOneTicketAtomic} in a loop for high-contention (one winner, rest rejected fast).
     *
     * @return list of reserved ticket IDs (may be fewer than count if not enough available)
     */
    List<UUID> findAndReserveAvailableTickets(UUID eventId, TicketType ticketType, int count);

    /** Atomically reserves up to count physical tickets with one shared deadline. */
    List<UUID> findAndReserveAvailableTickets(UUID eventId, TicketType ticketType, int count,
                                              LocalDateTime reservedUntil);

    /**
     * Releases tickets that are RESERVED and past their reserved_until time back to AVAILABLE.
     * Call periodically (e.g. every minute) via a scheduled task.
     * Returned IDs are used to remove stale cart rows that referenced those tickets.
     *
     * @return ticket IDs that were released (empty if none)
     */
    List<UUID> releaseExpiredReservations();

    /**
     * Releases expired RESERVED tickets for one event before inventory is reported.
     *
     * @return ticket IDs that were released (empty if none)
     */
    List<UUID> releaseExpiredReservationsForEvent(UUID eventId);

    /**
     * Returns all tickets for the event that have seat assignment (for reserved seating seat map).
     */
    List<TicketEntity> getSeatsForEvent(UUID eventId);

    /**
     * Creates a seat map for an event: one ticket per seat with section/row/number.
     * Event must have reservedSeatingEnabled. Pro/Enterprise only.
     *
     * @return number of seat tickets created
     */
    int createSeatMap(UUID eventId, UUID creatorId, List<SeatSectionSpec> sections);

    /** Spec for one section in a seat map. */
    record SeatSectionSpec(String name, int rowCount, int seatsPerRow, java.math.BigDecimal price) {}
}
