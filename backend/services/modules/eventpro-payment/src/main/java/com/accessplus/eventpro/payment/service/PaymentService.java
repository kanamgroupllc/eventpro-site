package com.accessplus.eventpro.payment.service;

import com.accessplus.eventpro.order.order.model.GuestOrderItem;
import com.accessplus.eventpro.shared.entity.OrderEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Service interface for payment processing operations.
 */
public interface PaymentService {
    
    /**
     * Creates a payment intent for an order.
     * 
     * @param amount payment amount
     * @return payment intent client secret
     * @throws RuntimeException if payment intent creation fails
     */
    String createPaymentIntent(BigDecimal amount);
    
    /**
     * Processes payment and creates order from cart.
     *
     * @param userId user ID
     * @param paymentIntentId Stripe payment intent ID
     * @return created order
     */
    OrderEntity processPayment(UUID userId, String paymentIntentId);

    /**
     * Processes payment and creates order from cart with jurisdiction-based tax.
     * When taxAmount is not null, order total = cartTotal + taxAmount and buyerState/buyerCountry are stored.
     *
     * @param userId user ID
     * @param paymentIntentId Stripe payment intent ID
     * @param taxAmount pre-computed tax from checkout-totals (by state); null to use default
     * @param buyerState purchaser state code (e.g. CA)
     * @param buyerCountry purchaser country code (e.g. US)
     * @return created order
     */
    OrderEntity processPayment(UUID userId, String paymentIntentId, BigDecimal taxAmount, String buyerState, String buyerCountry);

    /**
     * Processes payment with an explicit expected Stripe charge (cart total + tax minus wallet portion).
     */
    OrderEntity processPayment(UUID userId, String paymentIntentId, BigDecimal taxAmount, String buyerState,
                               String buyerCountry, BigDecimal expectedStripeAmount);

    /**
     * Processes payment for a guest (no account) and creates order from provided items.
     *
     * @param reservedTicketIds optional ticket IDs from guest-reserve (lock); when set, order uses these
     * @return created order
     */
    OrderEntity processGuestPayment(String paymentIntentId, String guestEmail, String guestFirstName,
                                    String guestLastName, List<GuestOrderItem> items, BigDecimal totalAmount,
                                    List<UUID> reservedTicketIds, BigDecimal donationAmount);

    /**
     * Guest payment with optional tax jurisdiction (state, country, taxAmount for order record).
     */
    OrderEntity processGuestPayment(String paymentIntentId, String guestEmail, String guestFirstName,
                                    String guestLastName, List<GuestOrderItem> items, BigDecimal totalAmount,
                                    List<UUID> reservedTicketIds, BigDecimal donationAmount,
                                    BigDecimal taxAmount, String buyerState, String buyerCountry);
}

