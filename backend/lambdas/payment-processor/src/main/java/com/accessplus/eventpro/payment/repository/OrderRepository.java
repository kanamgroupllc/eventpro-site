package com.accessplus.eventpro.payment.repository;

import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<OrderEntity, UUID> {

    @Query("SELECT o FROM OrderEntity o LEFT JOIN FETCH o.orderItems WHERE o.id = :orderId")
    Optional<OrderEntity> findByIdWithItems(@Param("orderId") UUID orderId);

    @Modifying
    @Query("UPDATE OrderEntity o SET o.status = :status WHERE o.id = :orderId")
    int updateOrderStatus(@Param("orderId") UUID orderId, @Param("status") OrderStatus status);
}
