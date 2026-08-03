package com.accessplus.eventpro.event.ticket.repository;

import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface TicketRepository extends JpaRepository<TicketEntity, UUID>, TicketRepositoryCustom {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TicketEntity t WHERE t.id = :id")
    Optional<TicketEntity> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TicketEntity t WHERE t.id IN :ids")
    List<TicketEntity> findAllByIdForUpdate(@Param("ids") List<UUID> ids);

    @Query(value = "SELECT * FROM tickets WHERE event_id = :eventId " +
            "AND CAST(ticket_type AS text) = :ticketType AND seat_section IS NULL FOR UPDATE", nativeQuery = true)
    List<TicketEntity> findGeneralAdmissionGroupForUpdate(@Param("eventId") UUID eventId,
                                                           @Param("ticketType") String ticketType);

    @Query("SELECT t FROM TicketEntity t WHERE t.eventId = :eventId")
    Page<TicketEntity> findByEventId(@Param("eventId") UUID eventId, Pageable pageable);

    Page<TicketEntity> findByTicketStatus(TicketStatus status, Pageable pageable);

    @Query(value = "SELECT * FROM tickets WHERE event_id = :eventId AND CAST(ticket_type AS text) = :ticketType", nativeQuery = true)
    Page<TicketEntity> findByEventIdAndTicketType(
            @Param("eventId") UUID eventId,
            @Param("ticketType") String ticketType,
            Pageable pageable);

    @Query("SELECT t FROM TicketEntity t WHERE t.eventId = :eventId AND t.ticketStatus = 'AVAILABLE'")
    List<TicketEntity> findAvailableTicketsByEventId(@Param("eventId") UUID eventId);

    @Query("SELECT t FROM TicketEntity t WHERE t.eventId = :eventId AND t.ticketType = :ticketType AND t.ticketStatus = 'AVAILABLE'")
    List<TicketEntity> findAvailableByEventIdAndType(@Param("eventId") UUID eventId, @Param("ticketType") TicketType ticketType, Pageable pageable);

    @Query("SELECT COUNT(t) FROM TicketEntity t WHERE t.eventId = :eventId AND t.ticketStatus = :status")
    long countByEventIdAndStatus(@Param("eventId") UUID eventId, @Param("status") TicketStatus status);

    long countByTicketStatus(TicketStatus status);

    /**
     * RESERVED tickets that should be released: past {@code reservedUntil}, or legacy rows with null
     * {@code reservedUntil} (never picked up by expiry before; stuck for weeks).
     */
    @Query("SELECT t FROM TicketEntity t WHERE t.ticketStatus = 'RESERVED' AND (t.reservedUntil IS NULL OR t.reservedUntil <= :before)")
    List<TicketEntity> findReservedWithExpiredHold(@Param("before") LocalDateTime before);

    /**
     * Event-scoped expired reservations for self-healing inventory reads.
     */
    @Query("SELECT t FROM TicketEntity t WHERE t.eventId = :eventId AND t.ticketStatus = 'RESERVED' AND (t.reservedUntil IS NULL OR t.reservedUntil <= :before)")
    List<TicketEntity> findReservedWithExpiredHoldForEvent(@Param("eventId") UUID eventId, @Param("before") LocalDateTime before);

    /** Max ticket price across the given event IDs (for risk scoring). Returns empty if list is empty or no tickets. */
    @Query("SELECT MAX(t.price) FROM TicketEntity t WHERE t.eventId IN :eventIds")
    Optional<BigDecimal> findMaxPriceByEventIds(@Param("eventIds") List<UUID> eventIds);

    /** Reserved seating: all tickets for event that have a seat (section/row/number). Ordered for seat map display. */
    @Query("SELECT t FROM TicketEntity t WHERE t.eventId = :eventId AND t.seatSection IS NOT NULL ORDER BY t.seatSection, t.seatRow, t.seatNumber")
    List<TicketEntity> findByEventIdWithSeats(@Param("eventId") UUID eventId);
}
