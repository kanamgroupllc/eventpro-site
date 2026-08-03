package com.accessplus.eventpro.order.cart.service;

import com.accessplus.eventpro.order.cart.entity.CartEntity;

import java.util.List;
import java.util.UUID;
import com.accessplus.eventpro.shared.enums.TicketType;

/**
 * Service interface for cart management operations.
 * 
 * <p>Provides methods for:
 * <ul>
 *   <li>Adding items to cart with ticket availability validation</li>
 *   <li>Updating cart item quantities</li>
 *   <li>Removing items from cart</li>
 *   <li>Retrieving user's cart</li>
 *   <li>Clearing the entire cart</li>
 *   <li>Cart validation (ticket availability, quantity limits)</li>
 * </ul>
 */
public interface CartService {

    record ImportLine(UUID eventId, TicketType ticketType, UUID ticketId, int quantity) {}

    /**
     * Adds a ticket to the user's cart.
     * Validates ticket availability and marks ticket as RESERVED.
     * 
     * @param userId the UUID of the user
     * @param ticketId the UUID of the ticket to add
     * @param quantity the quantity to add (defaults to 1 if not provided)
     * @return the created or updated CartEntity
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if user or ticket not found
     * @throws IllegalStateException if ticket is not available
     * @throws IllegalArgumentException if validation fails
     */
    CartEntity addItemToCart(UUID userId, UUID ticketId, Integer quantity);

    /** Adds a delta of GA tickets and returns the resulting physical cart rows. */
    List<CartEntity> addGeneralAdmission(UUID userId, UUID eventId, TicketType ticketType, int quantity);

    /** Sets the absolute GA quantity (1-4) by reserving/releasing the exact physical delta. */
    List<CartEntity> setGeneralAdmissionQuantity(UUID userId, UUID eventId, TicketType ticketType, int quantity);

    void removeGeneralAdmission(UUID userId, UUID eventId, TicketType ticketType);

    CartEntity addSeat(UUID userId, UUID ticketId);

    /** Imports an entire unreserved guest cart atomically. */
    List<CartEntity> importGuestCart(UUID userId, List<ImportLine> lines);

    /**
     * Updates the quantity of a cart item.
     * 
     * @param userId the UUID of the user
     * @param ticketId the UUID of the ticket
     * @param quantity the new quantity (must be > 0)
     * @return the updated CartEntity
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if cart item not found
     * @throws IllegalArgumentException if quantity is invalid
     */
    CartEntity updateCartItemQuantity(UUID userId, UUID ticketId, Integer quantity);

    /**
     * Removes an item from the user's cart.
     * Marks the ticket as AVAILABLE if it was RESERVED.
     * 
     * @param userId the UUID of the user
     * @param ticketId the UUID of the ticket to remove
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if cart item not found
     */
    void removeItemFromCart(UUID userId, UUID ticketId);

    /**
     * Retrieves all cart items for a user.
     * 
     * @param userId the UUID of the user
     * @return list of CartEntity for the user
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if user not found
     */
    List<CartEntity> getUserCart(UUID userId);

    /**
     * Clears all items from the user's cart.
     * Marks all reserved tickets as AVAILABLE.
     * 
     * @param userId the UUID of the user
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if user not found
     */
    void clearCart(UUID userId);

    /** Releases the cart during authoritative checkout expiry, bypassing the pending-session mutation guard. */
    void releaseCartForCheckoutExpiry(UUID userId);

    /** Releases only the physical tickets captured by a checkout session. */
    void releaseCartTicketsForCheckout(UUID userId, List<UUID> ticketIds);

    /** Deletes cart ownership after order creation without releasing the still-reserved tickets. */
    void consumeCart(UUID userId);

    /**
     * Calculates the total cost of items in the user's cart.
     * 
     * @param userId the UUID of the user
     * @return total cost as BigDecimal
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if user not found
     */
    java.math.BigDecimal calculateCartTotal(UUID userId);

    /**
     * Gets the total number of items in the user's cart.
     * 
     * @param userId the UUID of the user
     * @return total quantity of items
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if user not found
     */
    Integer getCartItemCount(UUID userId);

    /**
     * Releases expired ticket reservations still represented in the user's cart and removes
     * the corresponding cart rows.
     *
     * @param userId the UUID of the user
     * @return number of cart rows released and removed
     */
    int releaseExpiredCartReservations(UUID userId);

    /** Scheduler/inventory-read path that atomically releases due physical cart rows in a batch. */
    int releaseAllExpiredCartReservations();

    /**
     * Deletes cart line items for the given ticket IDs (e.g. after those reservations expired and
     * tickets were released back to AVAILABLE). No-op if {@code ticketIds} is null or empty.
     */
    void removeCartItemsForTicketIds(List<UUID> ticketIds);

    /**
     * Removes stale cart rows pointing at {@link com.accessplus.eventpro.shared.enums.TicketStatus#AVAILABLE}
     * tickets (no hold). Skips lines created in the last few minutes so we do not race with add-to-cart.
     *
     * @return number of cart rows deleted
     */
    int removeCartLinesForOrphanAvailableTickets();
}
