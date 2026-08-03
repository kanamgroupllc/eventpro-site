package com.accessplus.eventpro.order.order.service.impl;

import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.exception.ValidationException;
import com.accessplus.eventpro.core.messaging.sqs.SQSMessagePublisher;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
import com.accessplus.eventpro.order.cart.entity.CartEntity;
import com.accessplus.eventpro.order.cart.service.CartService;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.entity.OrderItemEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import com.accessplus.eventpro.order.order.config.PlatformFeeProvider;
import com.accessplus.eventpro.order.order.repository.OrderItemRepository;
import com.accessplus.eventpro.order.order.repository.OrderRepository;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for OrderServiceImpl.
 * Tests order creation, retrieval, status updates, and SQS integration.
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private CartService cartService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SQSMessagePublisher sqsMessagePublisher;

    @Mock
    private TicketService ticketService;

    @Mock
    private PlatformFeeProvider platformFeeProvider;

    private OrderServiceImpl orderService;

    private UUID userId;
    private UUID ticketId;
    private UUID orderId;
    private UserEntity user;
    private TicketEntity ticket;
    private CartEntity cartItem;
    private OrderEntity order;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        ticketId = UUID.randomUUID();
        orderId = UUID.randomUUID();

        user = new UserEntity();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setFirstName("Test");
        user.setLastName("User");

        ticket = new TicketEntity();
        ticket.setId(ticketId);
        ticket.setName("Test Ticket");
        ticket.setPrice(new BigDecimal("50.00"));
        ticket.setTicketType(TicketType.VIP);
        ticket.setTicketStatus(TicketStatus.RESERVED);

        cartItem = new CartEntity();
        cartItem.setId(UUID.randomUUID());
        cartItem.setUser(user);
        cartItem.setTicket(ticket);
        cartItem.setQuantity(1);

        order = new OrderEntity();
        order.setId(orderId);
        order.setOrderNumber("ORD-20250115-123456");
        order.setTotalAmount(new BigDecimal("50.00"));
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());
        order.setUserId(user.getId());
        order.setOrderItems(new ArrayList<>());

        orderService = new OrderServiceImpl(orderRepository, orderItemRepository, cartService, userRepository,
                ticketService, Optional.empty());
    }

    // ========== createOrderFromCart Tests ==========

    @Test
    void testCreateOrderFromCart_Success() {
        // Given
        List<CartEntity> cartItems = new ArrayList<>();
        cartItems.add(cartItem);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartService.getUserCart(userId)).thenReturn(cartItems);
        when(cartService.calculateCartTotal(userId)).thenReturn(new BigDecimal("50.00"));
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(orderRepository.saveAndFlush(any(OrderEntity.class))).thenAnswer(invocation -> {
            OrderEntity savedOrder = invocation.getArgument(0);
            savedOrder.setId(orderId);
            return savedOrder;
        });
        when(orderItemRepository.saveAndFlush(any(OrderItemEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doNothing().when(cartService).consumeCart(userId);

        // When
        OrderEntity result = orderService.createOrderFromCart(userId);

        // Then
        assertNotNull(result);
        assertEquals(orderId, result.getId());
        assertNotNull(result.getOrderNumber());
        assertTrue(result.getOrderNumber().startsWith("ORD-"));
        assertEquals(new BigDecimal("50.00"), result.getTotalAmount());
        assertEquals(OrderStatus.PENDING, result.getStatus());
        assertEquals(1, result.getOrderItems().size());
        verify(userRepository).findById(userId);
        verify(cartService).releaseExpiredCartReservations(userId);
        verify(cartService).getUserCart(userId);
        verify(cartService).calculateCartTotal(userId);
        verify(orderRepository).saveAndFlush(any(OrderEntity.class));
        verify(sqsMessagePublisher, never()).publishOrderMessage(any());
        verify(cartService).consumeCart(userId);
    }

    @Test
    void testCreateOrderFromCart_UserNotFound() {
        // Given
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> 
                orderService.createOrderFromCart(userId));
        verify(cartService, never()).releaseExpiredCartReservations(any());
        verify(cartService, never()).getUserCart(any());
        verify(orderRepository, never()).saveAndFlush(any(OrderEntity.class));
    }

    @Test
    void testCreateOrderFromCart_EmptyCart() {
        // Given
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartService.getUserCart(userId)).thenReturn(new ArrayList<>());

        // When/Then
        assertThrows(ValidationException.class, () -> 
                orderService.createOrderFromCart(userId));
        verify(cartService).releaseExpiredCartReservations(userId);
        verify(orderRepository, never()).saveAndFlush(any(OrderEntity.class));
    }

    @Test
    void testCreateOrderFromCart_ZeroTotal() {
        // Given
        List<CartEntity> cartItems = new ArrayList<>();
        cartItems.add(cartItem);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartService.getUserCart(userId)).thenReturn(cartItems);
        when(cartService.calculateCartTotal(userId)).thenReturn(BigDecimal.ZERO);

        // When/Then
        assertThrows(ValidationException.class, () -> 
                orderService.createOrderFromCart(userId));
        verify(cartService).releaseExpiredCartReservations(userId);
        verify(orderRepository, never()).saveAndFlush(any(OrderEntity.class));
    }

    @Test
    void testCreateOrderFromCart_DoesNotPublishLegacyFulfillmentMessage() {
        // Given
        List<CartEntity> cartItems = new ArrayList<>();
        cartItems.add(cartItem);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartService.getUserCart(userId)).thenReturn(cartItems);
        when(cartService.calculateCartTotal(userId)).thenReturn(new BigDecimal("50.00"));
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(orderRepository.saveAndFlush(any(OrderEntity.class))).thenAnswer(invocation -> {
            OrderEntity savedOrder = invocation.getArgument(0);
            savedOrder.setId(orderId);
            return savedOrder;
        });
        when(orderItemRepository.saveAndFlush(any(OrderItemEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doNothing().when(cartService).consumeCart(userId);

        // When
        OrderEntity result = orderService.createOrderFromCart(userId);

        // Then - API checkout owns fulfillment; no order/payment Lambda message is emitted.
        assertNotNull(result);
        verify(orderRepository).saveAndFlush(any(OrderEntity.class));
        verify(sqsMessagePublisher, never()).publishOrderMessage(any());
        verify(cartService).consumeCart(userId);
    }

    // ========== getOrderById Tests ==========

    @Test
    void testGetOrderById_Success() {
        // Given
        when(orderRepository.findByIdWithItems(orderId)).thenReturn(Optional.of(order));

        // When
        OrderEntity result = orderService.getOrderById(orderId);

        // Then
        assertNotNull(result);
        assertEquals(orderId, result.getId());
        verify(orderRepository).findByIdWithItems(orderId);
    }

    @Test
    void testGetOrderById_NotFound() {
        // Given
        when(orderRepository.findByIdWithItems(orderId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> 
                orderService.getOrderById(orderId));
    }

    // ========== getUserOrders Tests ==========

    @Test
    void testGetUserOrders_Success() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<OrderEntity> orders = new ArrayList<>();
        orders.add(order);
        Page<OrderEntity> orderPage = new PageImpl<>(orders, pageable, 1);

        when(userRepository.existsById(userId)).thenReturn(true);
        when(orderRepository.findByUserId(userId, pageable)).thenReturn(orderPage);

        // When
        Page<OrderEntity> result = orderService.getUserOrders(userId, pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        verify(userRepository).existsById(userId);
        verify(orderRepository).findByUserId(userId, pageable);
    }

    @Test
    void testGetUserOrders_UserNotFound() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.existsById(userId)).thenReturn(false);

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> 
                orderService.getUserOrders(userId, pageable));
        verify(orderRepository, never()).findByUserId(any(), any());
    }

    // ========== updateOrderStatus Tests ==========

    @Test
    void testUpdateOrderStatus_PendingToPaid() {
        // Given
        order.setStatus(OrderStatus.PENDING);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);

        // When
        OrderEntity result = orderService.updateOrderStatus(orderId, OrderStatus.PAID);

        // Then
        assertNotNull(result);
        assertEquals(OrderStatus.PAID, result.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void testUpdateOrderStatus_PendingToCancelled() {
        // Given
        order.setStatus(OrderStatus.PENDING);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);

        // When
        OrderEntity result = orderService.updateOrderStatus(orderId, OrderStatus.CANCELLED);

        // Then
        assertNotNull(result);
        assertEquals(OrderStatus.CANCELLED, result.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void testUpdateOrderStatus_PaidToRefunded() {
        // Given
        order.setStatus(OrderStatus.PAID);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);

        // When
        OrderEntity result = orderService.updateOrderStatus(orderId, OrderStatus.REFUNDED);

        // Then
        assertNotNull(result);
        assertEquals(OrderStatus.REFUNDED, result.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void testUpdateOrderStatus_OrderNotFound() {
        // Given
        when(orderRepository.findById(orderId)).thenReturn(Optional.empty());

        // When/Then
        assertThrows(ResourceNotFoundException.class, () -> 
                orderService.updateOrderStatus(orderId, OrderStatus.PAID));
        verify(orderRepository, never()).saveAndFlush(any(OrderEntity.class));
    }

    @Test
    void testUpdateOrderStatus_InvalidTransition_PendingToRefunded() {
        // Given
        order.setStatus(OrderStatus.PENDING);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        // When/Then
        assertThrows(IllegalStateException.class, () -> 
                orderService.updateOrderStatus(orderId, OrderStatus.REFUNDED));
        verify(orderRepository, never()).saveAndFlush(any(OrderEntity.class));
    }

    @Test
    void testUpdateOrderStatus_InvalidTransition_PaidToCancelled() {
        // Given
        order.setStatus(OrderStatus.PAID);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        // When/Then
        assertThrows(IllegalStateException.class, () -> 
                orderService.updateOrderStatus(orderId, OrderStatus.CANCELLED));
        verify(orderRepository, never()).saveAndFlush(any(OrderEntity.class));
    }

    @Test
    void testUpdateOrderStatus_InvalidTransition_CancelledToPaid() {
        // Given
        order.setStatus(OrderStatus.CANCELLED);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        // When/Then
        assertThrows(IllegalStateException.class, () -> 
                orderService.updateOrderStatus(orderId, OrderStatus.PAID));
        verify(orderRepository, never()).saveAndFlush(any(OrderEntity.class));
    }

    @Test
    void testUpdateOrderStatus_InvalidTransition_RefundedToPaid() {
        // Given
        order.setStatus(OrderStatus.REFUNDED);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        // When/Then
        assertThrows(IllegalStateException.class, () -> 
                orderService.updateOrderStatus(orderId, OrderStatus.PAID));
        verify(orderRepository, never()).saveAndFlush(any(OrderEntity.class));
    }

    @Test
    void testUpdateOrderStatus_SameStatus() {
        // Given
        order.setStatus(OrderStatus.PENDING);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);

        // When
        OrderEntity result = orderService.updateOrderStatus(orderId, OrderStatus.PENDING);

        // Then - Should succeed (no-op transition)
        assertNotNull(result);
        assertEquals(OrderStatus.PENDING, result.getStatus());
        verify(orderRepository).save(order);
    }

    // ========== generateOrderNumber Tests ==========

    @Test
    void testGenerateOrderNumber_Success() {
        // Given
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);

        // When
        String orderNumber = orderService.generateOrderNumber();

        // Then
        assertNotNull(orderNumber);
        assertTrue(orderNumber.startsWith("ORD-"));
        assertTrue(orderNumber.length() > 10);
        verify(orderRepository, atLeastOnce()).existsByOrderNumber(anyString());
    }

    @Test
    void testGenerateOrderNumber_UniquenessCheck() {
        // Given
        when(orderRepository.existsByOrderNumber(anyString()))
                .thenReturn(true)  // First call returns true (exists)
                .thenReturn(false); // Second call returns false (unique)

        // When
        String orderNumber = orderService.generateOrderNumber();

        // Then
        assertNotNull(orderNumber);
        verify(orderRepository, atLeast(2)).existsByOrderNumber(anyString());
    }

    @Test
    void testGenerateOrderNumber_Format() {
        // Given
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);

        // When
        String orderNumber = orderService.generateOrderNumber();

        // Then
        assertNotNull(orderNumber);
        String[] parts = orderNumber.split("-");
        assertEquals(3, parts.length);
        assertEquals("ORD", parts[0]);
        assertEquals(8, parts[1].length()); // YYYYMMDD
        assertEquals(6, parts[2].length()); // 6-digit random
    }
}
