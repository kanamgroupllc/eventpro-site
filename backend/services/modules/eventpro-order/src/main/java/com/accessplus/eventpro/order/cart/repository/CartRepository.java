package com.accessplus.eventpro.order.cart.repository;

import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.order.cart.entity.CartEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

/**
 * Repository interface for CartEntity.
 * Provides standard CRUD operations and custom query methods.
 * 
 * <p>Custom query methods:
 * <ul>
 *   <li>findByUser - Find all cart items for a user</li>
 *   <li>findByUserAndTicket - Find a specific cart item by user and ticket</li>
 *   <li>findByUserId - Find all cart items for a user by user ID</li>
 *   <li>deleteByUser - Delete all cart items for a user</li>
 * </ul>
 */
@Repository
public interface CartRepository extends JpaRepository<CartEntity, UUID> {

    /**
     * Finds all cart items for a specific user.
     * 
     * @param user the user entity
     * @return list of cart items for the user
     */
    List<CartEntity> findByUser(UserEntity user);

    /**
     * Finds all cart items for a specific user by user ID.
     * 
     * @param userId the user UUID
     * @return list of cart items for the user
     */
    @Query("SELECT c FROM CartEntity c JOIN FETCH c.ticket WHERE c.user.id = :userId ORDER BY c.createdAt, c.id")
    List<CartEntity> findByUserId(@Param("userId") UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CartEntity c JOIN FETCH c.ticket WHERE c.user.id = :userId ORDER BY c.createdAt, c.id")
    List<CartEntity> findByUserIdForUpdate(@Param("userId") UUID userId);

    @Query("SELECT c FROM CartEntity c JOIN FETCH c.ticket t WHERE c.user.id = :userId " +
            "AND t.eventId = :eventId AND t.ticketType = :ticketType AND t.seatSection IS NULL ORDER BY c.createdAt, c.id")
    List<CartEntity> findGeneralAdmissionLine(@Param("userId") UUID userId,
                                              @Param("eventId") UUID eventId,
                                              @Param("ticketType") com.accessplus.eventpro.shared.enums.TicketType ticketType);

    /**
     * Finds cart rows whose held ticket reservation has expired.
     */
    @Query("SELECT c FROM CartEntity c WHERE c.user.id = :userId AND c.ticket.ticketStatus = :status AND (c.ticket.reservedUntil IS NULL OR c.ticket.reservedUntil <= :before)")
    List<CartEntity> findByUserIdAndExpiredReservation(
            @Param("userId") UUID userId,
            @Param("status") TicketStatus status,
            @Param("before") LocalDateTime before);

    @Query(value = "SELECT c.* FROM carts c JOIN tickets t ON t.id = c.ticket_id " +
            "WHERE t.ticket_status = 'RESERVED' AND (t.reserved_until IS NULL OR t.reserved_until <= :before) " +
            "ORDER BY t.reserved_until NULLS FIRST LIMIT 500 FOR UPDATE OF c, t SKIP LOCKED", nativeQuery = true)
    List<CartEntity> findExpiredForUpdate(@Param("before") LocalDateTime before);

    /**
     * Finds a cart item by user and ticket.
     * Used to check if a ticket is already in the user's cart.
     * 
     * @param user the user entity
     * @param ticket the ticket entity
     * @return optional cart item if found
     */
    Optional<CartEntity> findByUserAndTicket(UserEntity user, TicketEntity ticket);

    /**
     * Finds a cart item by user ID and ticket ID.
     * 
     * @param userId the user UUID
     * @param ticketId the ticket UUID
     * @return optional cart item if found
     */
    @Query("SELECT c FROM CartEntity c WHERE c.user.id = :userId AND c.ticket.id = :ticketId")
    Optional<CartEntity> findByUserIdAndTicketId(@Param("userId") UUID userId, @Param("ticketId") UUID ticketId);

    /**
     * Deletes all cart items for a specific user.
     * Used when clearing the cart.
     * 
     * @param user the user entity
     */
    void deleteByUser(UserEntity user);

    /**
     * Deletes all cart items for a specific user by user ID.
     * 
     * @param userId the user UUID
     */
    @Query("DELETE FROM CartEntity c WHERE c.user.id = :userId")
    void deleteByUserId(@Param("userId") UUID userId);

    /**
     * Counts the number of cart items for a specific user.
     * 
     * @param userId the user UUID
     * @return count of cart items
     */
    @Query("SELECT COUNT(c) FROM CartEntity c WHERE c.user.id = :userId")
    long countByUserId(@Param("userId") UUID userId);

    @Query(value = "SELECT EXISTS (SELECT 1 FROM checkout_sessions WHERE user_id = CAST(:userId AS uuid) AND status = 'PENDING')",
            nativeQuery = true)
    boolean hasPendingCheckout(@Param("userId") UUID userId);

    /**
     * Removes cart rows pointing at tickets (e.g. after reservation expiry released inventory).
     */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM CartEntity c WHERE c.ticket.id IN :ids")
    int deleteByTicketIdIn(@Param("ids") Collection<UUID> ids);

    /**
     * Cart rows whose ticket was never held (AVAILABLE) and the line is older than {@code before}.
     * Excludes brand-new lines in the short window before {@code markTicketAsReserved} runs.
     */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM CartEntity c WHERE c.ticket.ticketStatus = :status AND c.createdAt < :before")
    int deleteByTicketStatusAndCreatedAtBefore(@Param("status") TicketStatus status, @Param("before") LocalDateTime before);
}
