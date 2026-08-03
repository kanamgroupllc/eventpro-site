package com.accessplus.eventpro.order.order.service.impl;

import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.order.cart.entity.CartEntity;
import com.accessplus.eventpro.order.cart.service.CartService;
import com.accessplus.eventpro.order.order.model.GuestOrderItem;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.entity.OrderItemEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import com.accessplus.eventpro.order.order.config.PlatformFeeProvider;
import com.accessplus.eventpro.order.order.repository.OrderItemRepository;
import com.accessplus.eventpro.order.order.repository.OrderRepository;
import com.accessplus.eventpro.order.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Implementation of OrderService.
 * Handles order creation, retrieval, and status management.
 * 
 * <p>Features:
 * <ul>
 *   <li>Create orders from cart items</li>
 *   <li>Generate unique order numbers</li>
 *   <li>Retrieve orders by ID or user</li>
 *   <li>Update order status with validation</li>
 *   <li>Order validation and error handling</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartService cartService;
    private final UserRepository userRepository;
    private final TicketService ticketService;
    private final Optional<PlatformFeeProvider> platformFeeProvider;

    @Value("${eventpro.tax.default-rate:0}")
    private double taxDefaultRate;

    private static final DateTimeFormatter ORDER_NUMBER_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private BigDecimal computeTax(BigDecimal subtotal) {
        if (subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0 || taxDefaultRate <= 0) {
            return BigDecimal.ZERO;
        }
        return subtotal.multiply(BigDecimal.valueOf(taxDefaultRate)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal computePlatformFee(BigDecimal totalAmount, int totalTicketQuantity) {
        if (platformFeeProvider.isEmpty()) return BigDecimal.ZERO;
        PlatformFeeProvider provider = platformFeeProvider.get();
        BigDecimal fee = BigDecimal.ZERO;
        if (totalAmount != null && totalAmount.compareTo(BigDecimal.ZERO) > 0) {
            double pct = provider.getFeePercent();
            if (pct > 0) {
                fee = fee.add(totalAmount.multiply(BigDecimal.valueOf(pct)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
            }
        }
        if (totalTicketQuantity > 0) {
            java.math.BigDecimal perTicket = provider.getFeePerTicket();
            if (perTicket != null && perTicket.compareTo(BigDecimal.ZERO) > 0) {
                fee = fee.add(perTicket.multiply(BigDecimal.valueOf(totalTicketQuantity)).setScale(2, RoundingMode.HALF_UP));
            }
        }
        return fee;
    }

    @Override
    public OrderEntity createOrderFromCart(UUID userId) {
        return createOrderFromCart(userId, null, null, null);
    }

    /**
     * Creates an order from the user's cart. When overrideTaxAmount is provided, uses it and stores buyer state/country for jurisdiction-based tax.
     */
    @Override
    public OrderEntity createOrderFromCart(UUID userId, BigDecimal overrideTaxAmount, String buyerState, String buyerCountry) {
        log.debug("Creating order from cart: userId={}", userId);

        // Validate and fetch user
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));

        cartService.releaseExpiredCartReservations(userId);

        // Get user's cart
        List<CartEntity> cartItems = cartService.getUserCart(userId);
        if (cartItems == null || cartItems.isEmpty()) {
            throw new ValidationException("Cannot create order from empty cart");
        }

        // Calculate total amount (subtotal)
        BigDecimal totalAmount = cartService.calculateCartTotal(userId);
        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Order total must be greater than 0");
        }

        // Generate unique order number
        String orderNumber = generateOrderNumber();

        // Build order items list first (so we can compute totalTickets for platform fee)
        List<OrderItemEntity> orderItems = new ArrayList<>();
        for (CartEntity cartItem : cartItems) {
            TicketEntity ticket = cartItem.getTicket();
            if (ticket == null) {
                log.warn("Cart item has null ticket, skipping: cartItemId={}", cartItem.getId());
                continue;
            }

            OrderItemEntity orderItem = new OrderItemEntity();
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPrice(ticket.getPrice()); // Store price at time of order
            orderItem.setTicketId(ticket.getId()); // Set UUID
            orderItem.setTicket(ticket); // Set relationship for JPA (optional, for lazy loading)
            orderItems.add(orderItem);
        }

        // Validate order has items
        if (orderItems.isEmpty()) {
            throw new ValidationException("Cannot create order with no valid items");
        }

        int totalTickets = orderItems.stream().mapToInt(OrderItemEntity::getQuantity).sum();

        BigDecimal taxAmount = overrideTaxAmount != null ? overrideTaxAmount : computeTax(totalAmount);
        BigDecimal orderTotal = totalAmount.add(taxAmount);
        // Create order entity (no items yet - order must be saved first to get ID)
        OrderEntity order = new OrderEntity();
        order.setOrderNumber(orderNumber);
        order.setTotalAmount(orderTotal);
        order.setTaxAmount(taxAmount);
        if (buyerState != null && !buyerState.isBlank()) order.setBuyerState(buyerState.trim().toUpperCase());
        if (buyerCountry != null && !buyerCountry.isBlank()) order.setBuyerCountry(buyerCountry.trim().toUpperCase());
        order.setPlatformFee(computePlatformFee(orderTotal, totalTickets));
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());
        order.setUserId(user.getId()); // Use UUID instead of relationship
        order.setOrderItems(new ArrayList<>());

        // Save order first so it gets an ID (required for order_items.order_id)
        OrderEntity savedOrder = orderRepository.saveAndFlush(order);
        // Set orderId and persist each item explicitly (cascade can insert with null order_id in some setups)
        for (OrderItemEntity orderItem : orderItems) {
            orderItem.setOrderId(savedOrder.getId());
            orderItem.setOrder(savedOrder);
            orderItemRepository.saveAndFlush(orderItem);
            savedOrder.getOrderItems().add(orderItem);
        }
        log.info("Created order: orderId={}, orderNumber={}, totalAmount={}, itemCount={}",
                savedOrder.getId(), orderNumber, totalAmount, orderItems.size());

        // The API payment finalizer is the sole fulfillment owner. Remove cart ownership without
        // releasing the exact tickets that the order is about to mark SOLD.
        cartService.consumeCart(userId);

        return savedOrder;
    }

    @Override
    public OrderEntity createOrderFromReservedTickets(UUID userId, String guestEmail, String guestFirstName,
                                                      String guestLastName, List<UUID> ticketIds,
                                                      BigDecimal totalAmount, BigDecimal taxAmount,
                                                      BigDecimal donationAmount, String buyerState,
                                                      String buyerCountry) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            throw new ValidationException("Checkout session contains no tickets");
        }
        if (userId != null && !userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", userId.toString());
        }
        List<OrderItemEntity> items = new ArrayList<>();
        BigDecimal ticketSubtotal = BigDecimal.ZERO;
        for (UUID ticketId : ticketIds) {
            TicketEntity ticket = ticketService.getTicketById(ticketId);
            if (ticket.getTicketStatus() != TicketStatus.RESERVED) {
                throw new ValidationException("Reserved ticket is no longer available: " + ticketId);
            }
            OrderItemEntity item = new OrderItemEntity();
            item.setQuantity(1);
            item.setPrice(ticket.getPrice());
            item.setTicketId(ticket.getId());
            item.setTicket(ticket);
            items.add(item);
            ticketSubtotal = ticketSubtotal.add(ticket.getPrice());
        }
        if (totalAmount == null || totalAmount.compareTo(ticketSubtotal) < 0) {
            throw new ValidationException("Checkout total is less than the reserved ticket subtotal");
        }
        OrderEntity order = new OrderEntity();
        order.setOrderNumber(generateOrderNumber());
        order.setTotalAmount(totalAmount.setScale(2, RoundingMode.HALF_UP));
        order.setTaxAmount(taxAmount != null ? taxAmount : BigDecimal.ZERO);
        order.setDonationAmount(donationAmount != null ? donationAmount : BigDecimal.ZERO);
        order.setBuyerState(buyerState);
        order.setBuyerCountry(buyerCountry);
        order.setPlatformFee(computePlatformFee(order.getTotalAmount(), items.size()));
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());
        order.setUserId(userId);
        order.setGuestEmail(guestEmail);
        order.setGuestFirstName(guestFirstName);
        order.setGuestLastName(guestLastName);
        order.setOrderItems(new ArrayList<>());
        OrderEntity saved = orderRepository.saveAndFlush(order);
        for (OrderItemEntity item : items) {
            item.setOrderId(saved.getId());
            item.setOrder(saved);
            orderItemRepository.saveAndFlush(item);
            saved.getOrderItems().add(item);
        }
        if (userId != null) cartService.consumeCart(userId);
        return saved;
    }

    @Override
    public OrderEntity createOrderForGuest(String guestEmail, String guestFirstName, String guestLastName,
                                           List<GuestOrderItem> items, BigDecimal totalAmount, BigDecimal donationAmount) {
        return createOrderForGuest(guestEmail, guestFirstName, guestLastName, items, totalAmount, donationAmount, null, null, null);
    }

    @Override
    public OrderEntity createOrderForGuest(String guestEmail, String guestFirstName, String guestLastName,
                                           List<GuestOrderItem> items, BigDecimal totalAmount, BigDecimal donationAmount,
                                           BigDecimal taxAmount, String buyerState, String buyerCountry) {
        log.debug("Creating guest order: email={}, itemCount={}", guestEmail, items != null ? items.size() : 0);
        if (guestEmail == null || guestEmail.isBlank()) {
            throw new ValidationException("Guest email is required");
        }
        if (items == null || items.isEmpty()) {
            throw new ValidationException("Order must have at least one item");
        }
        BigDecimal calculatedTotal = BigDecimal.ZERO;
        List<OrderItemEntity> orderItems = new ArrayList<>();
        for (GuestOrderItem item : items) {
            if (item.quantity() <= 0) {
                throw new ValidationException("Quantity must be greater than 0 for each item");
            }
            String ticketTypeStr = item.ticketType();
            if (ticketTypeStr != null) ticketTypeStr = ticketTypeStr.trim();
            if (isUuid(ticketTypeStr)) {
                // Reserved seating: ticketType is the specific seat ticket ID; quantity must be 1
                if (item.quantity() != 1) {
                    throw new ValidationException("Reserved seat items must have quantity 1");
                }
                UUID ticketId = UUID.fromString(ticketTypeStr);
                TicketEntity ticket = ticketService.getTicketById(ticketId);
                if (!ticket.getEventId().equals(item.eventId())) {
                    throw new ValidationException("Ticket does not belong to event " + item.eventId());
                }
                try {
                    ticketService.markTicketAsReserved(ticketId);
                } catch (Exception e) {
                    throw new ValidationException("Seat not available: " + e.getMessage());
                }
                OrderItemEntity orderItem = new OrderItemEntity();
                orderItem.setQuantity(1);
                orderItem.setPrice(ticket.getPrice());
                orderItem.setTicketId(ticket.getId());
                orderItem.setTicket(ticket);
                orderItems.add(orderItem);
                calculatedTotal = calculatedTotal.add(ticket.getPrice());
            } else {
                TicketType type;
                try {
                    type = TicketType.valueOf(ticketTypeStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    throw new ValidationException("Invalid ticket type: " + item.ticketType());
                }
                List<UUID> reservedTicketIds = ticketService.findAndReserveAvailableTickets(item.eventId(), type, item.quantity());
                if (reservedTicketIds.size() < item.quantity()) {
                    throw new ValidationException("Not enough tickets available for event " + item.eventId() + " type " + item.ticketType());
                }
                for (UUID tid : reservedTicketIds) {
                    TicketEntity ticket = ticketService.getTicketById(tid);
                    OrderItemEntity orderItem = new OrderItemEntity();
                    orderItem.setQuantity(1);
                    orderItem.setPrice(ticket.getPrice());
                    orderItem.setTicketId(ticket.getId());
                    orderItem.setTicket(ticket);
                    orderItems.add(orderItem);
                    calculatedTotal = calculatedTotal.add(ticket.getPrice());
                }
            }
        }
        // Allow totalAmount >= calculatedTotal (tickets) so add-ons amount is accepted; reject if paying less than tickets
        if (totalAmount == null || totalAmount.compareTo(calculatedTotal) < 0) {
            throw new ValidationException("Order total does not match calculated amount");
        }
        BigDecimal tax = taxAmount != null ? taxAmount : computeTax(totalAmount);
        BigDecimal orderTotal = taxAmount != null ? totalAmount : totalAmount.add(tax); // When tax from request, totalAmount is already final
        String orderNumber = generateOrderNumber();
        int totalTickets = orderItems.stream().mapToInt(OrderItemEntity::getQuantity).sum();
        BigDecimal donation = donationAmount != null && donationAmount.compareTo(BigDecimal.ZERO) >= 0 ? donationAmount : BigDecimal.ZERO;
        OrderEntity order = new OrderEntity();
        order.setOrderNumber(orderNumber);
        order.setTotalAmount(orderTotal);
        order.setTaxAmount(tax);
        if (buyerState != null && !buyerState.isBlank()) order.setBuyerState(buyerState.trim().toUpperCase());
        if (buyerCountry != null && !buyerCountry.isBlank()) order.setBuyerCountry(buyerCountry.trim().toUpperCase());
        order.setDonationAmount(donation);
        order.setPlatformFee(computePlatformFee(orderTotal, totalTickets));
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());
        order.setUserId(null);
        order.setGuestEmail(guestEmail);
        order.setGuestFirstName(guestFirstName);
        order.setGuestLastName(guestLastName);
        order.setOrderItems(new ArrayList<>());
        OrderEntity savedOrder = orderRepository.saveAndFlush(order);
        for (OrderItemEntity oi : orderItems) {
            oi.setOrderId(savedOrder.getId());
            oi.setOrder(savedOrder);
            orderItemRepository.saveAndFlush(oi);
            savedOrder.getOrderItems().add(oi);
        }
        log.info("Created guest order: orderId={}, orderNumber={}, guestEmail={}", savedOrder.getId(), orderNumber, guestEmail);
        return savedOrder;
    }

    /**
     * Returns true if the string is a valid UUID (used to detect reserved-seat ticket ID vs GA ticket type name).
     */
    private static boolean isUuid(String s) {
        if (s == null || s.isBlank()) return false;
        try {
            UUID.fromString(s.trim());
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    @Transactional
    public List<UUID> reserveTicketsForGuest(List<GuestOrderItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        List<UUID> allIds = new ArrayList<>();
        for (GuestOrderItem item : items) {
            if (item.quantity() <= 0) continue;
            String ticketTypeStr = item.ticketType() != null ? item.ticketType().trim() : "";
            if (isUuid(ticketTypeStr)) {
                // Reserved seating: ticketType is the specific seat ticket ID
                if (item.quantity() != 1) {
                    for (UUID id : allIds) {
                        try { ticketService.markTicketAsAvailable(id); } catch (Exception e) { log.warn("Failed to release ticket {}: {}", id, e.getMessage()); }
                    }
                    throw new ValidationException("Reserved seat items must have quantity 1");
                }
                UUID ticketId = UUID.fromString(ticketTypeStr.trim());
                TicketEntity ticket = ticketService.getTicketById(ticketId);
                if (!ticket.getEventId().equals(item.eventId())) {
                    for (UUID id : allIds) {
                        try { ticketService.markTicketAsAvailable(id); } catch (Exception e) { log.warn("Failed to release ticket {}: {}", id, e.getMessage()); }
                    }
                    throw new ValidationException("Ticket does not belong to event " + item.eventId());
                }
                try {
                    ticketService.markTicketAsReserved(ticketId);
                } catch (Exception e) {
                    for (UUID id : allIds) {
                        try { ticketService.markTicketAsAvailable(id); } catch (Exception ex) { log.warn("Failed to release ticket {}: {}", id, ex.getMessage()); }
                    }
                    throw new ValidationException("Seat not available: " + e.getMessage());
                }
                allIds.add(ticketId);
            } else {
                // General admission: ticketType is enum name (e.g. REGULAR, VIP, EARLY_BIRD)
                TicketType type;
                try {
                    type = TicketType.valueOf(ticketTypeStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    throw new ValidationException("Invalid ticket type: " + ticketTypeStr);
                }
                List<UUID> reserved = ticketService.findAndReserveAvailableTickets(item.eventId(), type, item.quantity());
                allIds.addAll(reserved);
                if (reserved.size() < item.quantity()) {
                    for (UUID id : allIds) {
                        try {
                            ticketService.markTicketAsAvailable(id);
                        } catch (Exception e) {
                            log.warn("Failed to release ticket {} on partial reserve failure: {}", id, e.getMessage());
                        }
                    }
                    throw new ValidationException("Not enough tickets available for event " + item.eventId() + " type " + ticketTypeStr);
                }
            }
        }
        return allIds;
    }

    @Override
    public OrderEntity createOrderForGuestWithReservedTickets(String guestEmail, String guestFirstName, String guestLastName,
                                                              List<GuestOrderItem> items, BigDecimal totalAmount,
                                                              List<UUID> reservedTicketIds, BigDecimal donationAmount) {
        return createOrderForGuestWithReservedTickets(guestEmail, guestFirstName, guestLastName, items, totalAmount, reservedTicketIds, donationAmount, null, null, null);
    }

    @Override
    public OrderEntity createOrderForGuestWithReservedTickets(String guestEmail, String guestFirstName, String guestLastName,
                                                              List<GuestOrderItem> items, BigDecimal totalAmount,
                                                              List<UUID> reservedTicketIds, BigDecimal donationAmount,
                                                              BigDecimal taxAmount, String buyerState, String buyerCountry) {
        if (reservedTicketIds == null || reservedTicketIds.isEmpty()) {
            return createOrderForGuest(guestEmail, guestFirstName, guestLastName, items, totalAmount, donationAmount, taxAmount, buyerState, buyerCountry);
        }
        int expectedCount = items.stream().mapToInt(GuestOrderItem::quantity).sum();
        if (reservedTicketIds.size() != expectedCount) {
            throw new ValidationException("Reserved ticket count does not match items");
        }
        BigDecimal calculatedTotal = BigDecimal.ZERO;
        List<OrderItemEntity> orderItems = new ArrayList<>();
        int idx = 0;
        for (GuestOrderItem item : items) {
            for (int q = 0; q < item.quantity(); q++) {
                UUID ticketId = reservedTicketIds.get(idx++);
                TicketEntity ticket = ticketService.getTicketById(ticketId);
                if (ticket.getTicketStatus() != TicketStatus.RESERVED) {
                    throw new ValidationException("Ticket " + ticketId + " is not reserved");
                }
                boolean matches = ticket.getEventId().equals(item.eventId())
                        && (isUuid(item.ticketType())
                                ? ticket.getId().equals(UUID.fromString(item.ticketType().trim()))
                                : ticket.getTicketType().name().equalsIgnoreCase(item.ticketType()));
                if (!matches) {
                    throw new ValidationException("Reserved ticket does not match item");
                }
                OrderItemEntity oi = new OrderItemEntity();
                oi.setQuantity(1);
                oi.setPrice(ticket.getPrice());
                oi.setTicketId(ticket.getId());
                oi.setTicket(ticket);
                orderItems.add(oi);
                calculatedTotal = calculatedTotal.add(ticket.getPrice());
            }
        }
        // Allow totalAmount >= calculatedTotal (tickets) so add-ons amount is accepted; reject if paying less than tickets
        if (totalAmount == null || totalAmount.compareTo(calculatedTotal) < 0) {
            throw new ValidationException("Order total does not match calculated amount");
        }
        BigDecimal tax = taxAmount != null ? taxAmount : computeTax(totalAmount);
        BigDecimal orderTotal = taxAmount != null ? totalAmount : totalAmount.add(tax);
        BigDecimal donation = donationAmount != null && donationAmount.compareTo(BigDecimal.ZERO) >= 0 ? donationAmount : BigDecimal.ZERO;
        String orderNumber = generateOrderNumber();
        int totalTickets = orderItems.stream().mapToInt(OrderItemEntity::getQuantity).sum();
        OrderEntity order = new OrderEntity();
        order.setOrderNumber(orderNumber);
        order.setTotalAmount(orderTotal);
        order.setTaxAmount(tax);
        if (buyerState != null && !buyerState.isBlank()) order.setBuyerState(buyerState.trim().toUpperCase());
        if (buyerCountry != null && !buyerCountry.isBlank()) order.setBuyerCountry(buyerCountry.trim().toUpperCase());
        order.setDonationAmount(donation);
        order.setPlatformFee(computePlatformFee(orderTotal, totalTickets));
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());
        order.setUserId(null);
        order.setGuestEmail(guestEmail);
        order.setGuestFirstName(guestFirstName);
        order.setGuestLastName(guestLastName);
        order.setOrderItems(new ArrayList<>());
        OrderEntity savedOrder = orderRepository.saveAndFlush(order);
        for (OrderItemEntity oi : orderItems) {
            oi.setOrderId(savedOrder.getId());
            oi.setOrder(savedOrder);
            orderItemRepository.saveAndFlush(oi);
            savedOrder.getOrderItems().add(oi);
        }
        log.info("Created guest order from reserved tickets: orderId={}, orderNumber={}", savedOrder.getId(), orderNumber);
        return savedOrder;
    }

    /**
     * Retrieves an order by ID.
     */
    @Override
    @Transactional(readOnly = true)
    public OrderEntity getOrderById(UUID orderId) {
        log.debug("Getting order by ID: {}", orderId);

        return orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId.toString()));
    }

    /**
     * Retrieves all orders for a user with pagination.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<OrderEntity> getUserOrders(UUID userId, Pageable pageable) {
        log.debug("Getting user orders: userId={}, page={}, size={}", 
                userId, pageable.getPageNumber(), pageable.getPageSize());

        // Validate user exists
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", userId.toString());
        }

        return orderRepository.findByUserId(userId, pageable);
    }

    /**
     * Updates the status of an order.
     */
    @Override
    public OrderEntity updateOrderStatus(UUID orderId, OrderStatus newStatus) {
        log.debug("Updating order status: orderId={}, newStatus={}", orderId, newStatus);

        // Fetch order
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId.toString()));

        // Store old status for logging
        OrderStatus oldStatus = order.getStatus();

        // Validate status transition
        validateStatusTransition(oldStatus, newStatus);

        // Update status
        order.setStatus(newStatus);
        OrderEntity updatedOrder = orderRepository.save(order);

        log.info("Updated order status: orderId={}, oldStatus={}, newStatus={}", 
                orderId, oldStatus, newStatus);

        return updatedOrder;
    }

    /**
     * Generates a unique order number.
     * Format: "ORD-{YYYYMMDD}-{random6digits}"
     */
    @Override
    public String generateOrderNumber() {
        String datePrefix = LocalDateTime.now().format(ORDER_NUMBER_DATE_FORMAT);
        String randomSuffix = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1000000));
        String orderNumber = String.format("ORD-%s-%s", datePrefix, randomSuffix);

        // Ensure uniqueness (retry if exists)
        int maxRetries = 10;
        int retries = 0;
        while (orderRepository.existsByOrderNumber(orderNumber) && retries < maxRetries) {
            randomSuffix = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1000000));
            orderNumber = String.format("ORD-%s-%s", datePrefix, randomSuffix);
            retries++;
        }

        if (retries >= maxRetries) {
            // Fallback: use UUID suffix if random generation fails
            orderNumber = String.format("ORD-%s-%s", datePrefix, UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

        log.debug("Generated order number: {}", orderNumber);
        return orderNumber;
    }

    /**
     * Validates order status transitions.
     * 
     * <p>Valid transitions:
     * <ul>
     *   <li>PENDING → PAID</li>
     *   <li>PENDING → CANCELLED</li>
     *   <li>PAID → REFUNDED</li>
     * </ul>
     * 
     * @param currentStatus current order status
     * @param newStatus new order status
     * @throws IllegalStateException if transition is invalid
     */
    private void validateStatusTransition(OrderStatus currentStatus, OrderStatus newStatus) {
        if (currentStatus == newStatus) {
            return; // No change, valid
        }

        switch (currentStatus) {
            case PENDING:
                if (newStatus != OrderStatus.PAID && newStatus != OrderStatus.CANCELLED) {
                    throw new IllegalStateException(
                            String.format("Invalid status transition from PENDING to %s. " +
                                    "PENDING can only transition to PAID or CANCELLED.", newStatus));
                }
                break;
            case PAID:
                if (newStatus != OrderStatus.REFUNDED) {
                    throw new IllegalStateException(
                            String.format("Invalid status transition from PAID to %s. " +
                                    "PAID can only transition to REFUNDED.", newStatus));
                }
                break;
            case CANCELLED:
                throw new IllegalStateException(
                        "Cannot change status of a CANCELLED order.");
            case REFUNDED:
                throw new IllegalStateException(
                        "Cannot change status of a REFUNDED order.");
            default:
                throw new IllegalStateException(
                        String.format("Unknown order status: %s", currentStatus));
        }
    }

    @Override
    public void markOrderTicketsAsSold(OrderEntity order) {
        if (order == null || order.getOrderItems() == null) return;
        UUID purchaserId = order.getUserId(); // null for guest
        for (OrderItemEntity oi : order.getOrderItems()) {
            try {
                ticketService.markTicketAsSold(oi.getTicketId(), purchaserId);
            } catch (IOException e) {
                throw new IllegalStateException("Failed to mark ticket as sold: " + oi.getTicketId(), e);
            }
        }
    }

    @Override
    public OrderEntity updateCheckoutMetadata(UUID orderId, String guestPhone, String howDidYouHear,
                                              Boolean receiveTicketViaWhatsApp, Boolean receiveTicketViaSms) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ValidationException("Order not found: " + orderId));
        if (guestPhone != null && !guestPhone.isBlank()) {
            order.setGuestPhone(guestPhone.trim());
        }
        if (howDidYouHear != null && !howDidYouHear.isBlank()) {
            order.setHowDidYouHear(howDidYouHear.trim());
        }
        if (receiveTicketViaWhatsApp != null) {
            order.setReceiveTicketViaWhatsApp(receiveTicketViaWhatsApp);
        }
        if (receiveTicketViaSms != null) {
            order.setReceiveTicketViaSms(receiveTicketViaSms);
        }
        return orderRepository.save(order);
    }

    @Override
    public OrderEntity updatePaymentDetails(UUID orderId, String paymentIntentId, BigDecimal walletAmount, String paymentMethod) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ValidationException("Order not found: " + orderId));
        if (paymentIntentId != null && !paymentIntentId.isBlank()) {
            order.setPaymentIntentId(paymentIntentId.trim());
        }
        if (walletAmount != null && walletAmount.compareTo(BigDecimal.ZERO) >= 0) {
            order.setWalletAmount(walletAmount);
        }
        if (paymentMethod != null && !paymentMethod.isBlank()) {
            order.setPaymentMethod(paymentMethod.trim().toUpperCase());
        }
        return orderRepository.save(order);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrderEntity> findPaidOrderByPaymentIntentId(String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            return Optional.empty();
        }
        return orderRepository.findByPaymentIntentIdAndStatus(paymentIntentId.trim(), OrderStatus.PAID);
    }
}
