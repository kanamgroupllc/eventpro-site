package com.accessplus.eventpro.order.repository;

import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<TicketEntity, UUID> {

    List<TicketEntity> findByEventIdAndTicketStatus(UUID eventId, TicketStatus ticketStatus);

    long countByEventIdAndTicketStatus(UUID eventId, TicketStatus ticketStatus);

    @Modifying
    @Query("UPDATE TicketEntity t SET t.ticketStatus = :status WHERE t.id = :ticketId")
    int updateTicketStatus(@Param("ticketId") UUID ticketId, @Param("status") TicketStatus status);

    default void releaseTicket(UUID ticketId) {
        updateTicketStatus(ticketId, TicketStatus.AVAILABLE);
    }
}
