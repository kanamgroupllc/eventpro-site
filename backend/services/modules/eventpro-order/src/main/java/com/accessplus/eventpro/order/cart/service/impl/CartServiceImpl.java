package com.accessplus.eventpro.order.cart.service.impl;

import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.shared.exception.ConflictException;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.order.cart.entity.CartEntity;
import com.accessplus.eventpro.order.cart.repository.CartRepository;
import com.accessplus.eventpro.order.cart.service.CartService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Clock;
import java.util.List;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.UUID;

/**
 * Implementation of CartService.
 * Handles cart CRUD operations with ticket availability validation.
 * 
 * <p>Features:
 * <ul>
 *   <li>Add items to cart with ticket availability check</li>
 *   <li>Update cart item quantities</li>
 *   <li>Remove items from cart</li>
 *   <li>Retrieve user's cart</li>
 *   <li>Clear entire cart</li>
 *   <li>Calculate cart total</li>
 *   <li>Ticket status management (AVAILABLE → RESERVED when added, RESERVED → AVAILABLE when removed)</li>
 *   <li>Validation of ticket availability and quantity limits</li>
 *   <li>Proper error handling and logging</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CartServiceImpl implements CartService {

    private static final int MAX_GA_TICKETS_PER_TYPE = 4;

    @Value("${eventpro.ticket.reservation-expiry-minutes:15}")
    private int reservationExpiryMinutes;

    private final CartRepository cartRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final TicketService ticketService;
    private final EventRepository eventRepository;
    private final Clock clock;

    /**
     * Adds a ticket to the user's cart.
     */
    @Override
    public CartEntity addItemToCart(UUID userId, UUID ticketId, Integer quantity) {
        log.debug("Adding item to cart: userId={}, ticketId={}, quantity={}", userId, ticketId, quantity);

        TicketEntity ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));

        // Validate quantity
        if (quantity == null || quantity <= 0) {
            throw new ValidationException("Quantity must be greater than 0");
        }

        if (ticket.getSeatSection() != null) {
            if (quantity != 1) {
                throw new ValidationException("Reserved seat items must have quantity 1");
            }
            return addSeat(userId, ticketId);
        }
        List<CartEntity> rows = addGeneralAdmission(userId, ticket.getEventId(), ticket.getTicketType(), quantity);
        return rows.get(0);
    }

    @Override
    public List<CartEntity> addGeneralAdmission(UUID userId, UUID eventId, TicketType ticketType, int quantity) {
        if (quantity <= 0) throw new ValidationException("Quantity must be greater than 0");
        lockUser(userId);
        assertCartMutable(userId);
        releaseExpiredCartReservationsLocked(userId, utcNow());
        List<CartEntity> existing = cartRepository.findGeneralAdmissionLine(userId, eventId, ticketType);
        return setGeneralAdmissionQuantityLocked(userId, eventId, ticketType, existing.size() + quantity);
    }

    @Override
    public List<CartEntity> setGeneralAdmissionQuantity(UUID userId, UUID eventId, TicketType ticketType, int quantity) {
        lockUser(userId);
        assertCartMutable(userId);
        releaseExpiredCartReservationsLocked(userId, utcNow());
        return setGeneralAdmissionQuantityLocked(userId, eventId, ticketType, quantity);
    }

    private List<CartEntity> setGeneralAdmissionQuantityLocked(UUID userId, UUID eventId,
                                                                TicketType ticketType, int quantity) {
        validateGaQuantity(quantity);
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (event.getEndTime() != null && !event.getEndTime().isAfter(utcNow())) {
            throw new ValidationException("This event has ended. Tickets are no longer available for purchase.");
        }

        List<CartEntity> rows = new ArrayList<>(cartRepository.findGeneralAdmissionLine(userId, eventId, ticketType));
        int delta = quantity - rows.size();
        if (delta > 0) {
            LocalDateTime deadline = cartDeadline(userId);
            List<UUID> reservedIds = ticketService.findAndReserveAvailableTickets(
                    eventId, ticketType, delta, deadline);
            if (reservedIds.size() != delta) {
                throw new ConflictException("INSUFFICIENT_INVENTORY: requested " + delta
                        + " additional ticket(s), but only " + reservedIds.size() + " remain");
            }
            for (UUID reservedId : reservedIds) {
                TicketEntity reservedTicket = ticketRepository.findById(reservedId)
                        .orElseThrow(() -> new ResourceNotFoundException("Ticket", reservedId.toString()));
                CartEntity row = new CartEntity();
                row.setUser(user);
                row.setTicket(reservedTicket);
                row.setQuantity(1);
                rows.add(cartRepository.save(row));
            }
        } else if (delta < 0) {
            rows.sort(Comparator.comparing(CartEntity::getCreatedAt,
                    Comparator.nullsLast(Comparator.naturalOrder())).reversed());
            List<CartEntity> removed = new ArrayList<>(rows.subList(0, -delta));
            for (CartEntity row : removed) {
                releasePhysicalRow(row);
            }
            rows.removeAll(removed);
        }
        return cartRepository.findGeneralAdmissionLine(userId, eventId, ticketType);
    }

    @Override
    public CartEntity addSeat(UUID userId, UUID ticketId) {
        UserEntity user = lockUser(userId);
        assertCartMutable(userId);
        releaseExpiredCartReservationsLocked(userId, utcNow());
        TicketEntity ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", ticketId.toString()));
        if (ticket.getSeatSection() == null) {
            throw new ValidationException("Ticket is not a reserved seat");
        }
        assertEventAcceptingTicketSales(ticket);
        if (cartRepository.findByUserIdAndTicketId(userId, ticketId).isPresent()) {
            throw new ConflictException("Seat is already in this cart");
        }
        LocalDateTime deadline = cartDeadline(userId);
        try {
            ticketService.markTicketAsReserved(ticketId, deadline);
        } catch (IllegalStateException ex) {
            throw new ConflictException("INSUFFICIENT_INVENTORY: seat is no longer available");
        }
        CartEntity row = new CartEntity();
        row.setUser(user);
        row.setTicket(ticket);
        row.setQuantity(1);
        return cartRepository.save(row);
    }

    @Override
    @Transactional
    public List<CartEntity> importGuestCart(UUID userId, List<ImportLine> lines) {
        if (lines == null || lines.isEmpty()) throw new ValidationException("Cart import is empty");
        lockUser(userId);
        assertCartMutable(userId);
        for (ImportLine line : lines) {
            if (line.ticketId() != null) {
                if (line.quantity() != 1) throw new ValidationException("A reserved seat must have quantity one");
                TicketEntity seat = ticketService.getTicketById(line.ticketId());
                if (!seat.getEventId().equals(line.eventId())) throw new ValidationException("Seat belongs to another event");
                addSeat(userId, line.ticketId());
            } else {
                if (line.ticketType() == null) throw new ValidationException("GA ticket type is required");
                addGeneralAdmission(userId, line.eventId(), line.ticketType(), line.quantity());
            }
        }
        return cartRepository.findByUserId(userId);
    }

    @Override
    public void removeGeneralAdmission(UUID userId, UUID eventId, TicketType ticketType) {
        lockUser(userId);
        assertCartMutable(userId);
        List<CartEntity> rows = cartRepository.findGeneralAdmissionLine(userId, eventId, ticketType);
        if (rows.isEmpty()) {
            throw new ResourceNotFoundException("Cart line", eventId + ":" + ticketType);
        }
        rows.forEach(this::releasePhysicalRow);
    }

    /**
     * Updates the quantity of a cart item.
     */
    @Override
    public CartEntity updateCartItemQuantity(UUID userId, UUID ticketId, Integer quantity) {
        log.debug("Updating cart item quantity: userId={}, ticketId={}, quantity={}", userId, ticketId, quantity);

        // Validate quantity
        if (quantity == null || quantity <= 0) {
            throw new ValidationException("Quantity must be greater than 0");
        }

        CartEntity cartItem = cartRepository.findByUserIdAndTicketId(userId, ticketId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cart item", String.format("userId=%s, ticketId=%s", userId, ticketId)));

        TicketEntity ticket = cartItem.getTicket();
        if (ticket.getSeatSection() != null) {
            if (quantity != 1) throw new ValidationException("Reserved seat items must have quantity 1");
            return cartItem;
        }
        return setGeneralAdmissionQuantity(userId, ticket.getEventId(), ticket.getTicketType(), quantity).get(0);
    }

    /**
     * Removes an item from the user's cart.
     */
    @Override
    public void removeItemFromCart(UUID userId, UUID ticketId) {
        log.debug("Removing item from cart: userId={}, ticketId={}", userId, ticketId);

        // Find cart item
        CartEntity cartItem = cartRepository.findByUserIdAndTicketId(userId, ticketId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cart item", String.format("userId=%s, ticketId=%s", userId, ticketId)));

        TicketEntity ticket = cartItem.getTicket();
        if (ticket.getSeatSection() == null) {
            removeGeneralAdmission(userId, ticket.getEventId(), ticket.getTicketType());
        } else {
            lockUser(userId);
            assertCartMutable(userId);
            releasePhysicalRow(cartItem);
        }
    }

    /**
     * Retrieves all cart items for a user.
     */
    @Override
    public List<CartEntity> getUserCart(UUID userId) {
        log.debug("Getting user cart: userId={}", userId);

        // Validate user exists
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", userId.toString());
        }

        releaseExpiredCartReservations(userId);
        List<CartEntity> cartItems = cartRepository.findByUserId(userId);
        log.debug("Found {} items in cart for user: userId={}", cartItems.size(), userId);
        return cartItems;
    }

    /**
     * Clears all items from the user's cart.
     */
    @Override
    @Transactional
    public void clearCart(UUID userId) {
        log.debug("Clearing cart: userId={}", userId);

        lockUser(userId);
        assertCartMutable(userId);
        releaseCartForCheckoutExpiry(userId);
    }

    @Override
    @Transactional
    public void releaseCartForCheckoutExpiry(UUID userId) {
        log.debug("Releasing cart for checkout expiry: userId={}", userId);

        // Validate user exists
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));

        // Get all cart items to mark tickets as available
        List<CartEntity> cartItems = cartRepository.findByUser(user);
        
        cartItems.forEach(this::releasePhysicalRow);
        log.info("Released cart: userId={}, removedItems={}", userId, cartItems.size());
    }

    @Override
    @Transactional
    public void releaseCartTicketsForCheckout(UUID userId, List<UUID> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) return;
        lockUser(userId);
        for (UUID ticketId : new LinkedHashSet<>(ticketIds)) {
            cartRepository.findByUserIdAndTicketId(userId, ticketId).ifPresent(this::releasePhysicalRow);
        }
    }

    @Override
    public void consumeCart(UUID userId) {
        UserEntity user = lockUser(userId);
        List<CartEntity> rows = cartRepository.findByUser(user);
        cartRepository.deleteAll(rows);
        log.info("Consumed cart for fulfilled order: userId={}, physicalTickets={}", userId, rows.size());
    }

    /**
     * Calculates the total cost of items in the user's cart.
     */
    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateCartTotal(UUID userId) {
        log.debug("Calculating cart total: userId={}", userId);

        // Validate user exists
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", userId.toString());
        }

        List<CartEntity> cartItems = cartRepository.findByUserId(userId);
        BigDecimal total = BigDecimal.ZERO;

        for (CartEntity cartItem : cartItems) {
            if (cartItem.getTicket() != null && cartItem.getTicket().getPrice() != null) {
                total = total.add(cartItem.getTicket().getPrice());
            }
        }

        log.debug("Cart total for user: userId={}, total={}", userId, total);
        return total;
    }

    /**
     * Gets the total number of items in the user's cart.
     */
    @Override
    @Transactional(readOnly = true)
    public Integer getCartItemCount(UUID userId) {
        log.debug("Getting cart item count: userId={}", userId);

        // Validate user exists
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", userId.toString());
        }

        List<CartEntity> cartItems = cartRepository.findByUserId(userId);
        int totalQuantity = cartItems.size();

        log.debug("Cart item count for user: userId={}, count={}", userId, totalQuantity);
        return totalQuantity;
    }

    @Override
    @Transactional
    public int releaseExpiredCartReservations(UUID userId) {
        return releaseExpiredCartReservationsLocked(userId, utcNow());
    }

    @Override
    @Transactional
    public int releaseAllExpiredCartReservations() {
        List<CartEntity> due = cartRepository.findExpiredForUpdate(utcNow());
        due.forEach(this::releasePhysicalRow);
        if (!due.isEmpty()) log.info("Released {} expired physical cart reservation(s)", due.size());
        return due.size();
    }

    private int releaseExpiredCartReservationsLocked(UUID userId, LocalDateTime now) {
        List<CartEntity> expiredItems = cartRepository.findByUserIdAndExpiredReservation(
                userId, TicketStatus.RESERVED, now);
        if (expiredItems == null || expiredItems.isEmpty()) {
            return 0;
        }

        int released = 0;
        for (CartEntity cartItem : expiredItems) {
            TicketEntity ticket = cartItem.getTicket();
            if (ticket == null || ticket.getId() == null) {
                continue;
            }
            releasePhysicalRow(cartItem);
            released++;
        }
        if (released > 0) {
            log.info("Released {} expired cart reservation(s) for user {}", released, userId);
        }
        return released;
    }

    @Override
    @Transactional
    public void removeCartItemsForTicketIds(List<UUID> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            return;
        }
        int deleted = cartRepository.deleteByTicketIdIn(ticketIds);
        if (deleted > 0) {
            log.info("Removed {} cart row(s) whose ticket reservations expired ({} ticket id(s))", deleted, ticketIds.size());
        }
    }

    /** Lines older than this with AVAILABLE tickets are treated as orphans (failed reserve or stale UI). */
    private static final int ORPHAN_CART_MIN_AGE_MINUTES = 5;

    @Override
    public int removeCartLinesForOrphanAvailableTickets() {
        LocalDateTime cutoff = utcNow().minusMinutes(ORPHAN_CART_MIN_AGE_MINUTES);
        int deleted = cartRepository.deleteByTicketStatusAndCreatedAtBefore(TicketStatus.AVAILABLE, cutoff);
        if (deleted > 0) {
            log.info("Removed {} stale cart row(s) pointing at AVAILABLE tickets (orphans)", deleted);
        }
        return deleted;
    }

    private void assertEventAcceptingTicketSales(TicketEntity ticket) {
        LocalDateTime now = utcNow();
        if (ticket.getEndTime() != null && ticket.getEndTime().isBefore(now)) {
            throw new ValidationException("This event has ended. Tickets are no longer available for purchase.");
        }
        UUID eventId = ticket.getEventId();
        if (eventId == null) {
            return;
        }
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId.toString()));
        if (event.getEndTime() != null && event.getEndTime().isBefore(now)) {
            throw new ValidationException("This event has ended. Tickets are no longer available for purchase.");
        }
    }

    private UserEntity lockUser(UUID userId) {
        return userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
    }

    private LocalDateTime cartDeadline(UUID userId) {
        return cartRepository.findByUserIdForUpdate(userId).stream()
                .map(CartEntity::getTicket)
                .filter(java.util.Objects::nonNull)
                .map(TicketEntity::getReservedUntil)
                .filter(java.util.Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElseGet(() -> utcNow().plusMinutes(reservationExpiryMinutes));
    }

    private void releasePhysicalRow(CartEntity row) {
        TicketEntity ticket = row.getTicket();
        if (ticket != null && ticket.getTicketStatus() == TicketStatus.RESERVED) {
            ticket.setTicketStatus(TicketStatus.AVAILABLE);
            ticket.setReservedUntil(null);
            ticket.setPurchaserId(null);
            ticketRepository.save(ticket);
        }
        cartRepository.delete(row);
    }

    private void validateGaQuantity(int quantity) {
        if (quantity < 1 || quantity > MAX_GA_TICKETS_PER_TYPE) {
            throw new ValidationException("General admission quantity must be between 1 and "
                    + MAX_GA_TICKETS_PER_TYPE);
        }
    }

    private void assertCartMutable(UUID userId) {
        if (cartRepository.hasPendingCheckout(userId)) {
            throw new ConflictException("CHECKOUT_IN_PROGRESS: cancel or complete checkout before editing the cart");
        }
    }

    private LocalDateTime utcNow() {
        return LocalDateTime.now(clock);
    }
}
