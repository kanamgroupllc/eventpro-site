package com.accessplus.eventpro.order.order.service;

import com.accessplus.eventpro.order.order.model.GuestOrderItem;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service interface for order management operations.
 * 
 * <p>Provides methods for:
 * <ul>
 *   <li>Creating orders from cart</li>
 *   <li>Retrieving orders by ID or user</li>
 *   <li>Updating order status</li>
 *   <li>Generating unique order numbers</li>
 *   <li>Publishing orders to SQS for asynchronous processing</li>
 * </ul>
 */
public interface OrderService {

    /**
     * Creates an order from the user's cart.
     * Converts cart items to order items, calculates total, generates order number,
     * and publishes order to SQS queue for processing.
     *
     * @param userId the UUID of the user
     * @return created OrderEntity
     */
    OrderEntity createOrderFromCart(UUID userId);

    /**
     * Creates an order from the user's cart with jurisdiction-based tax.
     * When overrideTaxAmount is not null, order total = cartTotal + overrideTaxAmount and buyer state/country are stored.
     *
     * @param userId the UUID of the user
     * @param overrideTaxAmount pre-computed tax amount (from checkout-totals by state); null to use default rate
     * @param buyerState purchaser state code (e.g. CA) for tax jurisdiction
     * @param buyerCountry purchaser country code (e.g. US)
     * @return created OrderEntity
     */
    OrderEntity createOrderFromCart(UUID userId, BigDecimal overrideTaxAmount, String buyerState, String buyerCountry);

    /** Creates an order from the exact physical tickets snapshotted by a checkout session. */
    OrderEntity createOrderFromReservedTickets(UUID userId, String guestEmail, String guestFirstName,
                                               String guestLastName, List<UUID> ticketIds,
                                               BigDecimal totalAmount, BigDecimal taxAmount,
                                               BigDecimal donationAmount, String buyerState,
                                               String buyerCountry);

    /**
     * Retrieves an order by ID.
     * 
     * @param orderId the UUID of the order
     * @return OrderEntity if found
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if order not found
     */
    OrderEntity getOrderById(UUID orderId);

    /**
     * Retrieves all orders for a user with pagination.
     * 
     * @param userId the UUID of the user
     * @param pageable pagination and sorting parameters
     * @return Page of OrderEntity for the user
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if user not found
     */
    Page<OrderEntity> getUserOrders(UUID userId, Pageable pageable);

    /**
     * Updates the status of an order.
     * Validates state transitions (PENDING → PAID/CANCELLED, PAID → REFUNDED).
     * 
     * @param orderId the UUID of the order
     * @param newStatus the new order status
     * @return updated OrderEntity
     * @throws com.accessplus.eventpro.core.common.exception.ResourceNotFoundException if order not found
     * @throws IllegalStateException if status transition is invalid
     */
    OrderEntity updateOrderStatus(UUID orderId, OrderStatus newStatus);

    /**
     * Generates a unique order number.
     * Format: "ORD-{YYYYMMDD}-{random6digits}"
     * 
     * @return unique order number string
     */
    String generateOrderNumber();

    /**
     * Creates an order for a guest (no user account).
     * Reserves tickets, creates order with guest email/name, and publishes to SQS.
     *
     * @param guestEmail guest email
     * @param guestFirstName guest first name
     * @param guestLastName guest last name
     * @param items line items (eventId, ticketType name, quantity)
     * @param totalAmount expected total (validated against sum of reserved ticket prices)
     * @return created order
     */
    OrderEntity createOrderForGuest(String guestEmail, String guestFirstName, String guestLastName,
                                    List<GuestOrderItem> items, BigDecimal totalAmount, BigDecimal donationAmount);

    OrderEntity createOrderForGuest(String guestEmail, String guestFirstName, String guestLastName,
                                    List<GuestOrderItem> items, BigDecimal totalAmount, BigDecimal donationAmount,
                                    BigDecimal taxAmount, String buyerState, String buyerCountry);

    /**
     * Same as createOrderForGuest but uses pre-reserved ticket IDs (from reserveTicketsForGuest).
     */
    OrderEntity createOrderForGuestWithReservedTickets(String guestEmail, String guestFirstName, String guestLastName,
                                                       List<GuestOrderItem> items, BigDecimal totalAmount,
                                                       List<UUID> reservedTicketIds, BigDecimal donationAmount);

    OrderEntity createOrderForGuestWithReservedTickets(String guestEmail, String guestFirstName, String guestLastName,
                                                       List<GuestOrderItem> items, BigDecimal totalAmount,
                                                       List<UUID> reservedTicketIds, BigDecimal donationAmount,
                                                       BigDecimal taxAmount, String buyerState, String buyerCountry);

    /**
     * Marks all tickets in the order as SOLD (reduces available count).
     * Called after payment is confirmed. For guest orders, purchaserId is null.
     */
    void markOrderTicketsAsSold(OrderEntity order);

    /**
     * Reserves tickets for a guest (lock) so they are held while the guest completes payment.
     * Returns the reserved ticket IDs in order (item1 qty N then item2 qty M, etc.).
     */
    List<UUID> reserveTicketsForGuest(List<GuestOrderItem> items);

    /**
     * Persists optional checkout metadata (attribution, phone, ticket delivery preferences).
     */
    OrderEntity updateCheckoutMetadata(UUID orderId, String guestPhone, String howDidYouHear,
                                       Boolean receiveTicketViaWhatsApp, Boolean receiveTicketViaSms);

    /**
     * Stores payment metadata after checkout (Stripe intent, wallet portion, method).
     */
    OrderEntity updatePaymentDetails(UUID orderId, String paymentIntentId, BigDecimal walletAmount, String paymentMethod);

    /**
     * Returns a paid order already linked to this Stripe PaymentIntent (idempotent confirm).
     */
    Optional<OrderEntity> findPaidOrderByPaymentIntentId(String paymentIntentId);
}
