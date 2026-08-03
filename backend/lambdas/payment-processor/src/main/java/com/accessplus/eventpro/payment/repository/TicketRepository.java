package com.accessplus.eventpro.payment.repository;

import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<TicketEntity, UUID> {

    @Query("SELECT t FROM TicketEntity t INNER JOIN OrderItemEntity oi ON t.id = oi.ticketId WHERE oi.orderId = :orderId")
    List<TicketEntity> findByOrderId(@Param("orderId") UUID orderId);
}
