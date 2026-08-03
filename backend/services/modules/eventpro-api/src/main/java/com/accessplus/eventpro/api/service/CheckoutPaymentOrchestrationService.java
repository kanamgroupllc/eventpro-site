package com.accessplus.eventpro.api.service;

import com.accessplus.eventpro.api.dto.ConfirmPaymentRequest;
import com.accessplus.eventpro.order.cart.service.CartService;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.payment.service.PaymentService;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.api.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CheckoutPaymentOrchestrationService {

    private final PaymentService paymentService;
    private final WalletService walletService;
    private final OrderService orderService;
    private final CartService cartService;

    @Transactional
    public OrderEntity confirmAuthenticatedPayment(UUID userId, ConfirmPaymentRequest request, BigDecimal taxAmount) {
        cartService.releaseExpiredCartReservations(userId);
        BigDecimal cartTotal = cartService.calculateCartTotal(userId);
        if (cartTotal == null || cartTotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Cart is empty.");
        }

        BigDecimal tax = taxAmount != null ? taxAmount : BigDecimal.ZERO;
        BigDecimal orderTotal = cartTotal.add(tax).setScale(2, RoundingMode.HALF_UP);
        BigDecimal walletAmount = normalizeWalletAmount(request.getWalletAmount());
        validateWalletApplication(userId, walletAmount, orderTotal);

        String state = trimOrNull(request.getState());
        String country = trimOrNull(request.getCountry());
        String paymentIntentId = trimOrNull(request.getPaymentIntentId());
        BigDecimal stripePortion = orderTotal.subtract(walletAmount).setScale(2, RoundingMode.HALF_UP);

        if (stripePortion.compareTo(BigDecimal.ZERO) <= 0) {
            OrderEntity order = orderService.createOrderFromCart(userId, taxAmount, state, country);
            walletService.debit(
                    userId,
                    orderTotal,
                    WalletService.REF_CHECKOUT,
                    order.getId(),
                    "order-debit:" + order.getId(),
                    "Ticket purchase (Electric Wallet)");
            order = orderService.updatePaymentDetails(order.getId(), null, orderTotal, "WALLET");
            order = orderService.updateOrderStatus(order.getId(), OrderStatus.PAID);
            orderService.markOrderTicketsAsSold(order);
            return order;
        }

        if (paymentIntentId == null) {
            throw new ValidationException("Payment intent ID is required when wallet does not cover the full total.");
        }

        String debitKey = checkoutDebitKey(userId);
        if (walletAmount.compareTo(BigDecimal.ZERO) > 0) {
            walletService.debit(
                    userId,
                    walletAmount,
                    WalletService.REF_CHECKOUT,
                    null,
                    debitKey,
                    "Ticket purchase (partial Electric Wallet)");
        }

        try {
            OrderEntity order = paymentService.processPayment(userId, paymentIntentId, taxAmount, state, country, stripePortion);
            String method = walletAmount.compareTo(BigDecimal.ZERO) > 0 ? "MIXED" : "STRIPE";
            return orderService.updatePaymentDetails(order.getId(), paymentIntentId, walletAmount, method);
        } catch (RuntimeException e) {
            if (walletAmount.compareTo(BigDecimal.ZERO) > 0) {
                walletService.credit(
                        userId,
                        walletAmount,
                        WalletService.REF_CHECKOUT_REVERSAL,
                        null,
                        debitKey + ":reversal",
                        "Checkout reversal");
            }
            throw e;
        }
    }

    private void validateWalletApplication(UUID userId, BigDecimal walletAmount, BigDecimal orderTotal) {
        if (walletAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        if (walletAmount.compareTo(orderTotal) > 0) {
            throw new ValidationException("Wallet amount cannot exceed order total.");
        }
        BigDecimal available = walletService.getBalance(userId).getBalance();
        if (available.compareTo(walletAmount) < 0) {
            throw new ValidationException("Insufficient Electric Wallet balance.");
        }
    }

    private static BigDecimal normalizeWalletAmount(BigDecimal walletAmount) {
        if (walletAmount == null || walletAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return walletAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private static String checkoutDebitKey(UUID userId) {
        return "checkout-debit:" + userId + ":" + System.currentTimeMillis();
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
