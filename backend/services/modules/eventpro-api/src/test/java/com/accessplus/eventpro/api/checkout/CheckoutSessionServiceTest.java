package com.accessplus.eventpro.api.checkout;

import com.accessplus.eventpro.api.config.TaxProperties;
import com.accessplus.eventpro.api.dto.*;
import com.accessplus.eventpro.api.wallet.service.WalletService;
import com.accessplus.eventpro.event.addon.repository.EventAddonRepository;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.order.cart.service.CartService;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.payment.stripe.service.StripeService;
import com.accessplus.eventpro.shared.entity.*;
import com.accessplus.eventpro.shared.enums.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.model.PaymentIntent;
import org.junit.jupiter.api.*;
import org.mockito.*;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Clock;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CheckoutSessionServiceTest {
    private CheckoutSessionRepository sessions = mock(CheckoutSessionRepository.class);
    private CheckoutSessionTicketRepository sessionTickets = mock(CheckoutSessionTicketRepository.class);
    private CartService cart = mock(CartService.class);
    private TicketService tickets = mock(TicketService.class);
    private TicketRepository ticketRepository = mock(TicketRepository.class);
    private EventAddonRepository addons = mock(EventAddonRepository.class);
    private OrderService orders = mock(OrderService.class);
    private StripeService stripe = mock(StripeService.class);
    private WalletService wallet = mock(WalletService.class);
    private TaxProperties taxes = mock(TaxProperties.class);
    private CheckoutOutboxService outbox = mock(CheckoutOutboxService.class);
    private UserRepository users = mock(UserRepository.class);
    private CheckoutSessionService service;

    @BeforeEach
    void setUp() {
        service = new CheckoutSessionService(sessions, sessionTickets, cart, tickets, ticketRepository,
                addons, orders, stripe, wallet, taxes, new ObjectMapper(), outbox, users, Clock.systemUTC());
        ReflectionTestUtils.setField(service, "holdMinutes", 15);
        ReflectionTestUtils.setField(service, "webBaseUrl", "https://tickets.example");
        ReflectionTestUtils.setField(service, "resumeTokenSecret", "test-resume-secret");
    }

    @Test
    void guestCreationReservesThreePhysicalTicketsWithOneDeadlineAndServerPrice() throws Exception {
        UUID eventId = UUID.randomUUID();
        List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        CreateCheckoutSessionRequest request = new CreateCheckoutSessionRequest();
        request.setIdempotencyKey(UUID.randomUUID().toString());
        request.setEmail("buyer@example.com"); request.setFirstName("A"); request.setLastName("Buyer");
        request.setItems(List.of(GuestOrderItemRequest.builder()
                .eventId(eventId).ticketType("REGULAR").quantity(3).build()));
        when(sessions.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
        when(tickets.findAndReserveAvailableTickets(eq(eventId), eq(TicketType.REGULAR), eq(3), any()))
                .thenReturn(ids);
        for (UUID id : ids) when(tickets.getTicketById(id)).thenReturn(ticket(id, eventId, new BigDecimal("20.00")));
        when(taxes.getRateForState(any())).thenReturn(0d);
        when(sessions.saveAndFlush(any())).thenAnswer(inv -> { CheckoutSessionEntity s = inv.getArgument(0); s.setId(UUID.randomUUID()); return s; });
        when(sessions.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stripe.createPaymentIntent(eq(new BigDecimal("60.00")), eq("usd"), anyMap(), anyString()))
                .thenReturn(new StripeService.CreatedPaymentIntent("pi_123", "secret"));

        CheckoutSessionService.Created created = service.create(null, request);

        assertEquals(new BigDecimal("60.00"), created.session().getTotalAmount());
        assertEquals("pi_123", created.session().getPaymentIntentId());
        assertEquals("secret", created.clientSecret());
        verify(sessionTickets, times(3)).save(any());
        ArgumentCaptor<LocalDateTime> deadline = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(tickets).findAndReserveAvailableTickets(eq(eventId), eq(TicketType.REGULAR), eq(3), deadline.capture());
        assertTrue(deadline.getValue().isAfter(LocalDateTime.now().plusMinutes(14)));
    }

    @Test
    void finalizationCreatesOneOrderItemSourcePerPhysicalTicketAndIsIdempotent() throws Exception {
        UUID sessionId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        CheckoutSessionEntity session = new CheckoutSessionEntity();
        session.setId(sessionId); session.setStatus(CheckoutSessionStatus.PENDING);
        session.setExpiresAt(LocalDateTime.now(java.time.ZoneOffset.UTC).plusMinutes(10));
        session.setPaymentIntentId("pi_123"); session.setTotalAmount(new BigDecimal("60.00"));
        session.setWalletAmount(BigDecimal.ZERO); session.setTaxAmount(BigDecimal.ZERO);
        session.setDonationAmount(BigDecimal.ZERO); session.setCurrency("usd");
        when(sessions.findByIdForUpdate(sessionId)).thenReturn(Optional.of(session));
        PaymentIntent intent = mock(PaymentIntent.class);
        when(intent.getStatus()).thenReturn("succeeded"); when(intent.getAmount()).thenReturn(6000L);
        when(intent.getCurrency()).thenReturn("usd");
        when(intent.getMetadata()).thenReturn(Map.of("checkout_session_id", sessionId.toString()));
        when(stripe.retrievePaymentIntent("pi_123")).thenReturn(intent);
        List<CheckoutSessionTicketEntity> lines = ids.stream().map(id -> { CheckoutSessionTicketEntity l = new CheckoutSessionTicketEntity(); l.setTicketId(id); return l; }).toList();
        when(sessionTickets.findByCheckoutSessionIdOrderByCreatedAt(sessionId)).thenReturn(lines);
        when(ticketRepository.findAllByIdForUpdate(ids)).thenReturn(ids.stream().map(id -> {
            TicketEntity ticket = ticket(id, UUID.randomUUID(), new BigDecimal("20.00"));
            ticket.setReservedUntil(LocalDateTime.now(java.time.ZoneOffset.UTC).plusMinutes(10));
            return ticket;
        }).toList());
        OrderEntity order = new OrderEntity(); order.setId(orderId); order.setStatus(OrderStatus.PENDING);
        when(orders.createOrderFromReservedTickets(isNull(), isNull(), isNull(), isNull(), eq(ids),
                eq(new BigDecimal("60.00")), eq(BigDecimal.ZERO), eq(BigDecimal.ZERO), isNull(), isNull())).thenReturn(order);
        when(orders.updatePaymentDetails(orderId, "pi_123", BigDecimal.ZERO, "STRIPE")).thenReturn(order);
        when(orders.updateOrderStatus(orderId, OrderStatus.PAID)).thenReturn(order);
        when(sessions.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CheckoutSessionEntity completed = service.finalizeSession(sessionId, null, resumeToken(session), "pi_123");
        assertEquals(CheckoutSessionStatus.COMPLETED, completed.getStatus());
        assertEquals(orderId, completed.getOrderId());
        verify(orders).markOrderTicketsAsSold(order);
        verify(outbox).enqueueIssuance(order);

        assertSame(completed, service.finalizeSession(sessionId, null, resumeToken(session), "pi_123"));
        verify(orders, times(1)).createOrderFromReservedTickets(any(), any(), any(), any(), anyList(), any(), any(), any(), any(), any());
    }

    @Test
    void succeededPaymentAfterCancellationIsRefundedIdempotently() throws Exception {
        UUID sessionId = UUID.randomUUID();
        CheckoutSessionEntity session = new CheckoutSessionEntity();
        session.setId(sessionId); session.setStatus(CheckoutSessionStatus.CANCELLED);
        session.setExpiresAt(LocalDateTime.now(java.time.ZoneOffset.UTC).plusMinutes(5));
        session.setPaymentIntentId("pi_late"); session.setTotalAmount(new BigDecimal("25.00"));
        session.setWalletAmount(BigDecimal.ZERO); session.setCurrency("usd");
        when(sessions.findByIdForUpdate(sessionId)).thenReturn(Optional.of(session));
        when(sessionTickets.findByCheckoutSessionIdOrderByCreatedAt(sessionId)).thenReturn(List.of());
        PaymentIntent intent = mock(PaymentIntent.class);
        when(intent.getStatus()).thenReturn("succeeded"); when(intent.getAmount()).thenReturn(2500L);
        when(intent.getCurrency()).thenReturn("usd");
        when(intent.getMetadata()).thenReturn(Map.of("checkout_session_id", sessionId.toString()));
        when(stripe.retrievePaymentIntent("pi_late")).thenReturn(intent);
        when(stripe.refundPayment("pi_late", "checkout-refund:" + sessionId)).thenReturn("re_123");
        when(sessions.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CheckoutSessionEntity refunded = service.finalizeSession(sessionId, null, resumeToken(session), "pi_late");

        assertEquals(CheckoutSessionStatus.REFUNDED, refunded.getStatus());
        assertEquals("re_123", refunded.getRefundId());
        verifyNoInteractions(orders);
    }

    private String resumeToken(CheckoutSessionEntity session) {
        String token = "test-resume-token";
        ReflectionTestUtils.setField(session, "resumeTokenHash", invokeHash(token));
        return token;
    }

    private String invokeHash(String token) {
        try {
            var method = CheckoutSessionService.class.getDeclaredMethod("hash", String.class);
            method.setAccessible(true); return (String) method.invoke(null, token);
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    private TicketEntity ticket(UUID id, UUID eventId, BigDecimal price) {
        TicketEntity t = new TicketEntity(); t.setId(id); t.setEventId(eventId); t.setTicketType(TicketType.REGULAR);
        t.setTicketStatus(TicketStatus.RESERVED); t.setPrice(price); return t;
    }
}
