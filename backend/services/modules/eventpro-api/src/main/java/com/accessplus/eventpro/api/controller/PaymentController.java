package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.audit.AuditLogService;
import com.accessplus.eventpro.api.config.RecaptchaProperties;
import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.CheckoutTotalsResponse;
import com.accessplus.eventpro.api.dto.ConfirmPaymentRequest;
import com.accessplus.eventpro.api.dto.CreatePaymentIntentRequest;
import com.accessplus.eventpro.api.dto.GuestConfirmPaymentRequest;
import com.accessplus.eventpro.api.dto.GuestReserveRequest;
import com.accessplus.eventpro.api.dto.OrderResponse;
import com.accessplus.eventpro.api.service.CheckoutPaymentOrchestrationService;
import com.accessplus.eventpro.api.security.RecaptchaVerificationService;
import com.accessplus.eventpro.api.util.ClientIpResolver;
import com.accessplus.eventpro.api.notification.service.NotificationPreferenceService;
import com.accessplus.eventpro.api.notification.service.UserNotificationService;
import com.accessplus.eventpro.core.notification.service.NotificationService;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.event.event.service.EventService;
import com.accessplus.eventpro.api.config.TaxProperties;
import com.accessplus.eventpro.order.cart.service.CartService;
import com.accessplus.eventpro.order.order.model.GuestOrderItem;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.payment.service.PaymentService;
import com.accessplus.eventpro.shared.entity.OrderItemEntity;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Payment processing API")
public class PaymentController extends BaseController {

    @Value("${eventpro.ticket.reservation-expiry-minutes:15}")
    private int reservationExpiryMinutes;

    @Value("${stripe.publishableKey:}")
    private String stripePublishableKey;

    private final TaxProperties taxProperties;

    private final PaymentService paymentService;
    private final OrderService orderService;
    private final CartService cartService;
    private final NotificationService notificationService;
    private final UserNotificationService userNotificationService;
    private final NotificationPreferenceService notificationPreferenceService;
    private final EventService eventService;
    private final UserService userService;
    private final CheckoutPaymentOrchestrationService checkoutPaymentOrchestrationService;
    private final RecaptchaVerificationService recaptchaVerificationService;
    private final RecaptchaProperties recaptchaProperties;
    private final AuditLogService auditLogService;

    @GetMapping("/checkout-totals")
    @Operation(summary = "Checkout totals with tax", description = "Returns subtotal, tax rate, tax amount, and total. Pass state (e.g. CA) and country (e.g. US) for jurisdiction-based tax; otherwise uses default rate. Use total for create-intent when tax > 0.")
    public ResponseEntity<ApiResponse<CheckoutTotalsResponse>> getCheckoutTotals(
            @RequestParam(required = false) BigDecimal subtotal,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String country) {
        BigDecimal sub = subtotal;
        if (sub == null || sub.compareTo(BigDecimal.ZERO) < 0) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() != null && !(auth.getPrincipal() instanceof String)) {
                try {
                    UUID userId = JwtUtils.getCurrentUserId();
                    cartService.releaseExpiredCartReservations(userId);
                    sub = cartService.calculateCartTotal(userId);
                    if (sub == null) sub = BigDecimal.ZERO;
                } catch (Exception e) {
                    sub = BigDecimal.ZERO;
                }
            }
        }
        if (sub == null || sub.compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Subtotal required when not authenticated. Pass ?subtotal= amount or log in."));
        }
        // Jurisdiction-based rate: use buyer state when country is US (or omitted); else default rate
        boolean useStateRate = country == null || country.isBlank() || "US".equalsIgnoreCase(country.trim());
        double ratePercent = useStateRate ? taxProperties.getRateForState(state) : taxProperties.getDefaultRate();
        BigDecimal tax = BigDecimal.ZERO;
        if (ratePercent > 0) {
            tax = sub.multiply(BigDecimal.valueOf(ratePercent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        BigDecimal total = sub.add(tax);
        CheckoutTotalsResponse body = CheckoutTotalsResponse.builder()
                .subtotal(sub)
                .taxRatePercent(ratePercent)
                .tax(tax)
                .total(total)
                .build();
        return ResponseEntity.ok(ApiResponse.success(body, null));
    }

    @GetMapping("/config")
    @Operation(summary = "Payment config (public)", description = "Returns Stripe publishable key for the frontend card form. No auth required.")
    public ResponseEntity<ApiResponse<Map<String, String>>> getPaymentConfig() {
        Map<String, String> config = new HashMap<>();
        String key = stripePublishableKey != null ? stripePublishableKey.trim() : "";
        config.put("stripePublishableKey", key);
        String siteKey = recaptchaProperties.getSiteKey() != null ? recaptchaProperties.getSiteKey().trim() : "";
        if (!siteKey.isBlank()) {
            config.put("recaptchaSiteKey", siteKey);
        }
        return ResponseEntity.ok(ApiResponse.success(config, null));
    }

    @PostMapping("/create-intent")
    @Operation(summary = "Create payment intent", description = "Creates a Stripe payment intent for the specified amount. Available to all (guest and authenticated).")
    public ResponseEntity<ApiResponse<Map<String, String>>> createPaymentIntent(
            @Valid @RequestBody CreatePaymentIntentRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(ApiResponse.error("LEGACY_CHECKOUT_DISABLED: create a server-priced checkout session"));
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Confirm payment (authenticated)", description = "Confirms a Stripe payment and creates an order from the user's cart. Optional state/country for jurisdiction-based sales tax.")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmPayment(
            @Valid @RequestBody ConfirmPaymentRequest request) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(ApiResponse.error("LEGACY_CHECKOUT_DISABLED: finalize a valid checkout session"));
    }

    @PostMapping("/guest-reserve")
    @Operation(summary = "Reserve tickets for guest (lock)", description = "Reserves tickets while guest completes payment. Call before create-intent. Returned IDs and reservedUntil (ISO-8601) for countdown.")
    public ResponseEntity<ApiResponse<Map<String, ?>>> guestReserve(
            @Valid @RequestBody GuestReserveRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(ApiResponse.error("LEGACY_CHECKOUT_DISABLED: guest holds are created by checkout sessions"));
    }

    @PostMapping("/guest/confirm")
    @Operation(summary = "Confirm guest payment", description = "Confirms a Stripe payment and creates an order for a guest (no account).")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmGuestPayment(
            @Valid @RequestBody GuestConfirmPaymentRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(ApiResponse.error("LEGACY_CHECKOUT_DISABLED: finalize a valid checkout session"));
    }

    /**
     * Sends order confirmation email to the purchaser (user or guest).
     * Resolves event name from first order item; does not fail the request if notification fails.
     */
    private void sendOrderConfirmationNotification(com.accessplus.eventpro.shared.entity.OrderEntity order,
                                                   UUID userId, String guestEmail) {
        try {
            String toEmail;
            String recipientName;
            if (userId != null) {
                var user = userService.getUserById(userId);
                toEmail = user != null ? user.getEmail() : null;
                recipientName = user != null && user.getFirstName() != null ? user.getFirstName() : "Guest";
            } else {
                toEmail = order.getGuestEmail();
                recipientName = order.getGuestFirstName() != null ? order.getGuestFirstName() : "Guest";
            }
            String eventName = null;
            if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
                OrderItemEntity first = order.getOrderItems().get(0);
                TicketEntity ticket = first.getTicket();
                if (ticket != null && ticket.getEventId() != null) {
                    try {
                        eventName = eventService.getEventById(ticket.getEventId()).getName();
                    } catch (Exception e) {
                        log.debug("Could not resolve event name for notification: {}", e.getMessage());
                    }
                }
            }
            notificationService.sendOrderConfirmationEmail(
                    toEmail,
                    recipientName,
                    order.getOrderNumber(),
                    eventName,
                    order.getTotalAmount());
            if (userId != null && notificationPreferenceService.isInAppEnabled(userId)) {
                try {
                    userNotificationService.storeInAppNotification(
                            userId,
                            "Order confirmed",
                            "Your order " + order.getOrderNumber() + " has been confirmed.",
                            "ORDER_CONFIRMATION");
                } catch (Exception inAppEx) {
                    log.warn("Failed to store in-app order confirmation: orderId={}, error={}", order.getId(), inAppEx.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send order confirmation notification: orderId={}, error={}", order.getId(), e.getMessage());
        }
    }
}
