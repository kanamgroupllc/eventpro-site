package com.accessplus.eventpro.payment.service.impl;

import com.accessplus.eventpro.order.cart.service.CartService;
import com.accessplus.eventpro.order.order.model.GuestOrderItem;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.payment.service.PaymentService;
import com.accessplus.eventpro.payment.stripe.StripePaymentValidator;
import com.accessplus.eventpro.payment.stripe.model.StripeBillingAddress;
import com.accessplus.eventpro.payment.stripe.service.StripeService;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of PaymentService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {
    
    private final StripeService stripeService;
    private final OrderService orderService;
    private final CartService cartService;
    
    @Override
    public String createPaymentIntent(BigDecimal amount) {
        log.debug("Creating payment intent for amount: {}", amount);
        try {
            return stripeService.createPaymentIntent(amount, "usd");
        } catch (Exception e) {
            log.error("Failed to create payment intent: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create payment intent: " + e.getMessage(), e);
        }
    }
    
    @Override
    @Transactional
    public OrderEntity processPayment(UUID userId, String paymentIntentId) {
        return processPayment(userId, paymentIntentId, null, null, null);
    }

    @Override
    @Transactional
    public OrderEntity processPayment(UUID userId, String paymentIntentId, BigDecimal taxAmount, String buyerState, String buyerCountry) {
        return processPayment(userId, paymentIntentId, taxAmount, buyerState, buyerCountry, null);
    }

    @Override
    @Transactional
    public OrderEntity processPayment(UUID userId, String paymentIntentId, BigDecimal taxAmount, String buyerState,
                                      String buyerCountry, BigDecimal expectedStripeAmount) {
        log.debug("Processing payment: userId={}, paymentIntentId={}", userId, paymentIntentId);

        Optional<OrderEntity> existing = orderService.findPaidOrderByPaymentIntentId(paymentIntentId);
        if (existing.isPresent()) {
            log.info("Payment intent already fulfilled: orderId={}, paymentIntentId={}", existing.get().getId(), paymentIntentId);
            return existing.get();
        }

        BigDecimal expectedCharge = expectedStripeAmount != null
                ? expectedStripeAmount.setScale(2, RoundingMode.HALF_UP)
                : resolveAuthenticatedStripeCharge(userId, taxAmount);

        PaymentIntent paymentIntent = confirmAndValidate(paymentIntentId, expectedCharge);

        StripeBillingAddress stripeAddress = resolveBillingAddress(paymentIntentId);
        String orderState = stripeAddress != null && stripeAddress.getState() != null ? stripeAddress.getState() : buyerState;
        String orderCountry = stripeAddress != null && stripeAddress.getCountry() != null ? stripeAddress.getCountry() : buyerCountry;

        OrderEntity order = orderService.createOrderFromCart(userId, taxAmount, orderState, orderCountry);
        order = orderService.updatePaymentDetails(order.getId(), paymentIntentId, BigDecimal.ZERO, "STRIPE");
        order = orderService.updateOrderStatus(order.getId(), OrderStatus.PAID);
        orderService.markOrderTicketsAsSold(order);

        log.info("Payment processed successfully: orderId={}, paymentIntentId={}", order.getId(), paymentIntentId);
        return order;
    }

    @Override
    @Transactional
    public OrderEntity processGuestPayment(String paymentIntentId, String guestEmail, String guestFirstName,
                                           String guestLastName, List<GuestOrderItem> items, BigDecimal totalAmount,
                                           List<UUID> reservedTicketIds, BigDecimal donationAmount) {
        return processGuestPayment(paymentIntentId, guestEmail, guestFirstName, guestLastName, items, totalAmount,
                reservedTicketIds, donationAmount, null, null, null);
    }

    @Override
    @Transactional
    public OrderEntity processGuestPayment(String paymentIntentId, String guestEmail, String guestFirstName,
                                           String guestLastName, List<GuestOrderItem> items, BigDecimal totalAmount,
                                           List<UUID> reservedTicketIds, BigDecimal donationAmount,
                                           BigDecimal taxAmount, String buyerState, String buyerCountry) {
        log.debug("Processing guest payment: paymentIntentId={}, guestEmail={}", paymentIntentId, guestEmail);

        Optional<OrderEntity> existing = orderService.findPaidOrderByPaymentIntentId(paymentIntentId);
        if (existing.isPresent()) {
            log.info("Guest payment intent already fulfilled: orderId={}, paymentIntentId={}", existing.get().getId(), paymentIntentId);
            return existing.get();
        }

        BigDecimal expectedCharge = resolveGuestChargeTotal(totalAmount, taxAmount);
        PaymentIntent paymentIntent = confirmAndValidate(paymentIntentId, expectedCharge);

        StripeBillingAddress stripeAddress = resolveBillingAddress(paymentIntentId);
        String orderState = stripeAddress != null && stripeAddress.getState() != null ? stripeAddress.getState() : buyerState;
        String orderCountry = stripeAddress != null && stripeAddress.getCountry() != null ? stripeAddress.getCountry() : buyerCountry;

        OrderEntity order;
        if (reservedTicketIds != null && !reservedTicketIds.isEmpty()) {
            order = orderService.createOrderForGuestWithReservedTickets(guestEmail, guestFirstName, guestLastName, items, totalAmount, reservedTicketIds, donationAmount, taxAmount, orderState, orderCountry);
        } else {
            order = orderService.createOrderForGuest(guestEmail, guestFirstName, guestLastName, items, totalAmount, donationAmount, taxAmount, orderState, orderCountry);
        }
        order = orderService.updatePaymentDetails(order.getId(), paymentIntentId, BigDecimal.ZERO, "STRIPE");
        order = orderService.updateOrderStatus(order.getId(), OrderStatus.PAID);
        orderService.markOrderTicketsAsSold(order);
        log.info("Guest payment processed: orderId={}, paymentIntentId={}", order.getId(), paymentIntentId);
        return order;
    }

    private PaymentIntent confirmAndValidate(String paymentIntentId, BigDecimal expectedCharge) {
        PaymentIntent paymentIntent;
        try {
            paymentIntent = stripeService.confirmPayment(paymentIntentId);
        } catch (Exception e) {
            log.error("Failed to confirm payment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to confirm payment: " + e.getMessage(), e);
        }

        if (!"succeeded".equals(paymentIntent.getStatus())) {
            throw new RuntimeException("Payment not succeeded. Status: " + paymentIntent.getStatus());
        }

        StripePaymentValidator.validateAmount(paymentIntent, expectedCharge);
        return paymentIntent;
    }

    private BigDecimal resolveAuthenticatedStripeCharge(UUID userId, BigDecimal taxAmount) {
        cartService.releaseExpiredCartReservations(userId);
        BigDecimal cartTotal = cartService.calculateCartTotal(userId);
        if (cartTotal == null || cartTotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Cart is empty.");
        }
        BigDecimal tax = taxAmount != null ? taxAmount : BigDecimal.ZERO;
        return cartTotal.add(tax).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal resolveGuestChargeTotal(BigDecimal totalAmount, BigDecimal taxAmount) {
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Order total must be greater than 0.");
        }
        if (taxAmount != null) {
            return totalAmount.setScale(2, RoundingMode.HALF_UP);
        }
        return totalAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private StripeBillingAddress resolveBillingAddress(String paymentIntentId) {
        try {
            return stripeService.getBillingAddressFromPaymentIntent(paymentIntentId);
        } catch (Exception e) {
            log.warn("Could not retrieve billing address from Stripe: {}", e.getMessage());
            return null;
        }
    }
}
