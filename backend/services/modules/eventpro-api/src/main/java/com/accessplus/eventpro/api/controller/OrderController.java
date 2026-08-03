package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.OrderResponse;
import com.accessplus.eventpro.api.audit.AuditLogService;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.api.wallet.service.WalletService;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.payment.stripe.service.StripeService;
import com.stripe.exception.StripeException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Order management API")
@SecurityRequirement(name = "bearerAuth")
public class OrderController extends BaseController {

    private final OrderService orderService;
    private final WalletService walletService;
    private final StripeService stripeService;
    private final AuditLogService auditLogService;

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Create order from cart", description = "Creates an order from the authenticated user's cart. " +
            "Requires USER, ADMIN, or ORGANIZER role. The cart will be cleared after order creation.")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder() {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(ApiResponse.error("LEGACY_CHECKOUT_DISABLED: orders are created only by checkout-session finalization"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Get order by ID", description = "Retrieves an order by its ID. " +
            "Users can only access their own orders. Admins can access any order. " +
            "Requires USER, ADMIN, or ORGANIZER role.")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable UUID id) {
        log.debug("Received request to get order by ID: {}", id);

        // Get current user's UUID from JWT
        UUID currentUserId = JwtUtils.getCurrentUserId();
        boolean isAdmin = hasAdminRole();

        // Get order
        OrderEntity order = orderService.getOrderById(id);

        // Check authorization: user can only access their own orders, admin can access any
        if (!isAdmin && !order.getUserId().equals(currentUserId)) {
            throw new ResourceNotFoundException("Order", id.toString());
        }

        OrderResponse response = OrderResponse.fromEntity(order);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Get orders", description = "Retrieves orders for the authenticated user, or all orders if admin. " +
            "Requires USER, ADMIN, or ORGANIZER role. Supports pagination.")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getOrders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "orderDate") String sortBy,
            @RequestParam(defaultValue = "asc") String dir) {
        log.debug("Received request to get orders: page={}, size={}, sortBy={}, dir={}", 
                page, size, sortBy, dir);

        // Get current user's UUID from JWT
        UUID currentUserId = JwtUtils.getCurrentUserId();

        // Convert page from 1-based to 0-based
        int pageIndex = page > 0 ? page - 1 : 0;
        
        // Validate sort direction
        Sort.Direction direction = "desc".equalsIgnoreCase(dir) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
        
        // Create pageable with sorting
        Pageable pageable = PageRequest.of(pageIndex, size, Sort.by(direction, sortBy));

        // Get orders: admin gets all orders, user gets their own orders
        // Note: For now, both admin and user get their own orders since getAllOrders is not implemented
        // TODO: Implement getAllOrders method in OrderService for admin to get all orders
        Page<OrderEntity> orderPage = orderService.getUserOrders(currentUserId, pageable);

        Page<OrderResponse> responsePage = orderPage.map(OrderResponse::fromEntity);
        return ResponseEntity.ok(ApiResponse.success(responsePage));
    }

 
    @GetMapping("/users/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Get user's orders", description = "Retrieves orders for a specific user. " +
            "Users can only access their own orders. Admins can access any user's orders. " +
            "Requires USER, ADMIN, or ORGANIZER role. Supports pagination.")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getUserOrders(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "orderDate") String sortBy,
            @RequestParam(defaultValue = "asc") String dir) {
        log.debug("Received request to get orders for user: userId={}, page={}, size={}, sortBy={}, dir={}", 
                userId, page, size, sortBy, dir);

        // Get current user's UUID from JWT
        UUID currentUserId = JwtUtils.getCurrentUserId();
        boolean isAdmin = hasAdminRole();

        // Check authorization: user can only access their own orders, admin can access any
        if (!isAdmin && !userId.equals(currentUserId)) {
            throw new ResourceNotFoundException("User", userId.toString());
        }

        // Convert page from 1-based to 0-based
        int pageIndex = page > 0 ? page - 1 : 0;
        
        // Validate sort direction
        Sort.Direction direction = "desc".equalsIgnoreCase(dir) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
        
        // Create pageable with sorting
        Pageable pageable = PageRequest.of(pageIndex, size, Sort.by(direction, sortBy));

        // Get user's orders
        Page<OrderEntity> orderPage = orderService.getUserOrders(userId, pageable);
        Page<OrderResponse> responsePage = orderPage.map(OrderResponse::fromEntity);

        return ResponseEntity.ok(ApiResponse.success(responsePage));
    }

    @GetMapping("/my-orders")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Get my orders", description = "Retrieves orders for the authenticated user. " +
            "Requires USER, ADMIN, or ORGANIZER role. Supports pagination.")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getMyOrders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "orderDate") String sortBy,
            @RequestParam(defaultValue = "asc") String dir) {
        log.debug("Received request to get my orders: page={}, size={}, sortBy={}, dir={}", 
                page, size, sortBy, dir);

        // Get current user's UUID from JWT
        UUID currentUserId = JwtUtils.getCurrentUserId();

        // Convert page from 1-based to 0-based
        int pageIndex = page > 0 ? page - 1 : 0;
        
        // Validate sort direction
        Sort.Direction direction = "desc".equalsIgnoreCase(dir) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
        
        // Create pageable with sorting
        Pageable pageable = PageRequest.of(pageIndex, size, Sort.by(direction, sortBy));

        // Get user's orders
        Page<OrderEntity> orderPage = orderService.getUserOrders(currentUserId, pageable);
        Page<OrderResponse> responsePage = orderPage.map(OrderResponse::fromEntity);

        return ResponseEntity.ok(ApiResponse.success(responsePage));
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'ORGANIZER')")
    @Operation(summary = "Request refund for order", description = "Requests a refund for an order. " +
            "Users can only refund their own orders. Admins can refund any order. " +
            "Requires USER, ADMIN, or ORGANIZER role.")
    public ResponseEntity<ApiResponse<OrderResponse>> requestRefund(@PathVariable UUID id) {
        log.debug("Received request to refund order: {}", id);

        // Get current user's UUID from JWT
        UUID currentUserId = JwtUtils.getCurrentUserId();
        boolean isAdmin = hasAdminRole();

        // Get order
        OrderEntity order = orderService.getOrderById(id);

        // Check authorization: user can only refund their own orders, admin can refund any
        if (!isAdmin && !order.getUserId().equals(currentUserId)) {
            throw new ResourceNotFoundException("Order", id.toString());
        }

        if (order.getStatus() != OrderStatus.PAID) {
            throw new ResourceNotFoundException("Order", id.toString());
        }

        OrderEntity refundedOrder = orderService.updateOrderStatus(id, OrderStatus.REFUNDED);

        String paymentMethod = refundedOrder.getPaymentMethod();
        String paymentIntentId = refundedOrder.getPaymentIntentId();
        BigDecimal walletAmount = refundedOrder.getWalletAmount() != null
                ? refundedOrder.getWalletAmount() : BigDecimal.ZERO;

        boolean stripeRefundRequired = paymentIntentId != null && !paymentIntentId.isBlank()
                && (paymentMethod == null || "STRIPE".equalsIgnoreCase(paymentMethod)
                || "MIXED".equalsIgnoreCase(paymentMethod));

        if (stripeRefundRequired) {
            try {
                stripeService.refundPayment(paymentIntentId);
            } catch (StripeException e) {
                log.error("Stripe refund failed for order {}: {}", id, e.getMessage(), e);
                throw new ValidationException("Stripe refund failed: " + e.getMessage());
            }
        }

        if (refundedOrder.getUserId() != null) {
            BigDecimal walletRefund = BigDecimal.ZERO;
            if ("WALLET".equalsIgnoreCase(paymentMethod)) {
                walletRefund = refundedOrder.getTotalAmount();
            } else if ("MIXED".equalsIgnoreCase(paymentMethod)) {
                walletRefund = walletAmount;
            }
            if (walletRefund != null && walletRefund.compareTo(BigDecimal.ZERO) > 0) {
                walletService.credit(
                        refundedOrder.getUserId(),
                        walletRefund,
                        WalletService.REF_ORDER_REFUND,
                        refundedOrder.getId(),
                        "order-refund:" + refundedOrder.getId(),
                        "Refund for order " + refundedOrder.getOrderNumber());
            }
        }

        auditLogService.recordFinanceEvent(
                currentUserId,
                "ORDER_REFUNDED",
                "order",
                id.toString(),
                "Order " + refundedOrder.getOrderNumber() + " refunded");

        OrderResponse response = OrderResponse.fromEntity(refundedOrder);

        log.info("Order refunded successfully: orderId={}, userId={}", id, currentUserId);
        return ResponseEntity.ok(ApiResponse.success(response, "Refund requested successfully"));
    }

    private boolean hasAdminRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> authority.equals("ROLE_ADMIN"));
    }
}
