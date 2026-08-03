package com.accessplus.eventpro.order.order.repository;

import com.accessplus.eventpro.shared.entity.OrderItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItemEntity, UUID> {

    @Query("SELECT oi FROM OrderItemEntity oi WHERE oi.orderId = :orderId")
    List<OrderItemEntity> findByOrderId(@Param("orderId") UUID orderId);

    @Query("SELECT oi FROM OrderItemEntity oi WHERE oi.ticketId = :ticketId")
    List<OrderItemEntity> findByTicketId(@Param("ticketId") UUID ticketId);

    @Query("SELECT COUNT(oi) FROM OrderItemEntity oi WHERE oi.orderId = :orderId")
    long countByOrderId(@Param("orderId") UUID orderId);

    /**
     * Finds all order items for tickets in the given list.
     */
    @Query("SELECT oi FROM OrderItemEntity oi WHERE oi.ticketId IN :ticketIds")
    List<OrderItemEntity> findByTicketIdIn(@Param("ticketIds") List<UUID> ticketIds);
}

