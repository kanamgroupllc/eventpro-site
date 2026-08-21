package com.accessplus.eventpro.api.checkout;

import com.accessplus.eventpro.core.messaging.sqs.SQSMessagePublisher;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.model.NotificationMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

class CheckoutOutboxServiceTest {
    @Test
    void publishesOneManifestBackedTicketEmailWithStableOutboxMessageId() throws Exception {
        CheckoutOutboxRepository repository = mock(CheckoutOutboxRepository.class);
        CheckoutOutboxStateService state = mock(CheckoutOutboxStateService.class);
        TicketArtifactService artifacts = mock(TicketArtifactService.class);
        OrderService orders = mock(OrderService.class);
        SQSMessagePublisher publisher = mock(SQSMessagePublisher.class);
        CheckoutOutboxService service = new CheckoutOutboxService(repository, state, artifacts, orders,
                mock(UserRepository.class), publisher, new ObjectMapper());

        UUID eventId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        CheckoutOutboxEventEntity event = new CheckoutOutboxEventEntity();
        event.setId(eventId);
        event.setEventType("ORDER_CONFIRMATION");
        event.setPayload(orderId.toString());
        event.setNextAttemptAt(LocalDateTime.now());
        when(state.claimDue()).thenReturn(List.of(event));

        OrderEntity order = new OrderEntity();
        order.setId(orderId);
        order.setOrderNumber("ORD-1");
        order.setTotalAmount(new BigDecimal("25.00"));
        order.setGuestEmail("buyer@example.com");
        order.setOrderItems(new ArrayList<>());
        when(orders.getOrderById(orderId)).thenReturn(order);
        when(artifacts.createOrderManifest(orderId)).thenReturn("ticket-artifacts/orders/" + orderId + "/manifest-v1.json");

        assertEquals(1, service.processDue());

        ArgumentCaptor<Object> sent = ArgumentCaptor.forClass(Object.class);
        verify(publisher).publishNotificationMessage(sent.capture());
        NotificationMessage message = (NotificationMessage) sent.getValue();
        assertEquals(2, message.getSchemaVersion());
        assertEquals(eventId, message.getMessageId());
        assertEquals("ORDER_TICKETS", message.getMessageType());
        assertEquals(orderId, message.getPayload().getOrderId());
        assertEquals("ticket-artifacts/orders/" + orderId + "/manifest-v1.json",
                message.getPayload().getManifestKey());
        assertNull(message.getPayload().getEmail());
        verify(state).complete(eventId);
    }
}
