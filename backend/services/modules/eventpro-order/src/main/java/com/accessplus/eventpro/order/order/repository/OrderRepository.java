package com.accessplus.eventpro.order.order.repository;

import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for OrderEntity.
 * Provides standard CRUD operations and custom query methods.
 * 
 * <p>Custom query methods:
 * <ul>
 *   <li>findByUser - Find all orders for a user</li>
 *   <li>findByStatus - Find all orders with a specific status</li>
 *   <li>findByOrderNumber - Find order by order number</li>
 *   <li>findByUserId - Find all orders for a user by user ID (paginated)</li>
 *   <li>findByStatusAndOrderDateBetween - Find orders by status in date range</li>
 * </ul>
 */
@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, UUID> {

    /**
     * Finds all orders for a specific user by user ID.
     * 
     * @param userId the user UUID
     * @return list of orders for the user
     */
    List<OrderEntity> findByUserId(UUID userId);

    /**
     * Finds all orders for a specific user by user ID with pagination.
     * 
     * @param userId the user UUID
     * @param pageable pagination parameters
     * @return page of orders for the user
     */
    @EntityGraph(attributePaths = {"orderItems", "orderItems.ticket"})
    @Query("SELECT o FROM OrderEntity o WHERE o.userId = :userId")
    Page<OrderEntity> findByUserId(@Param("userId") UUID userId, Pageable pageable);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.ticket"})
    @Query("SELECT o FROM OrderEntity o WHERE o.id = :orderId")
    Optional<OrderEntity> findByIdWithItems(@Param("orderId") UUID orderId);

    /**
     * Finds all orders with a specific status.
     * 
     * @param status the order status
     * @param pageable pagination parameters
     * @return page of orders with the status
     */
    Page<OrderEntity> findByStatus(OrderStatus status, Pageable pageable);

    /**
     * Finds an order by its order number.
     * 
     * @param orderNumber the order number
     * @return optional order if found
     */
    Optional<OrderEntity> findByOrderNumber(String orderNumber);

    /**
     * Finds orders by status within a date range.
     * 
     * @param status the order status
     * @param startDate the start date (inclusive)
     * @param endDate the end date (inclusive)
     * @param pageable pagination parameters
     * @return page of orders matching the criteria
     */
    @Query("SELECT o FROM OrderEntity o WHERE o.status = :status AND o.orderDate BETWEEN :startDate AND :endDate")
    Page<OrderEntity> findByStatusAndOrderDateBetween(
            @Param("status") OrderStatus status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    /**
     * Finds orders by status within a date range using createdAt (audit timestamp).
     * Use for pending balance when order_date may not be set in all code paths.
     */
    @Query("SELECT o FROM OrderEntity o WHERE o.status = :status AND o.createdAt BETWEEN :startDate AND :endDate")
    Page<OrderEntity> findByStatusAndCreatedAtBetween(
            @Param("status") OrderStatus status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    /**
     * Counts orders by status.
     * 
     * @param status the order status
     * @return count of orders with the status
     */
    long countByStatus(OrderStatus status);

    /**
     * Checks if an order number exists.
     * 
     * @param orderNumber the order number
     * @return true if order number exists
     */
    boolean existsByOrderNumber(String orderNumber);

    Optional<OrderEntity> findByPaymentIntentIdAndStatus(String paymentIntentId, OrderStatus status);
}

