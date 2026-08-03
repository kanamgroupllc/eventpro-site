package com.accessplus.eventpro.api.checkout;

import com.accessplus.eventpro.core.messaging.sqs.SQSMessagePublisher;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.event.ticket.repository.TicketRepository;
import com.accessplus.eventpro.event.ticket.service.TicketService;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.model.NotificationMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CheckoutOutboxService {
    private final CheckoutOutboxRepository repository;
    private final TicketService ticketService;
    private final TicketRepository ticketRepository;
    private final OrderService orderService;
    private final UserRepository userRepository;
    private final SQSMessagePublisher publisher;

    public void enqueueIssuance(OrderEntity order) {
        order.getOrderItems().forEach(item -> enqueue("TICKET_ISSUANCE", item.getTicketId().toString(), item.getTicketId().toString()));
        enqueue("ORDER_CONFIRMATION", order.getId().toString(), order.getId().toString());
    }

    private void enqueue(String type, String aggregate, String payload) {
        CheckoutOutboxEventEntity event = new CheckoutOutboxEventEntity();
        event.setEventType(type); event.setAggregateId(aggregate); event.setPayload(payload);
        event.setStatus("PENDING"); event.setNextAttemptAt(utcNow());
        repository.save(event);
    }

    @Transactional
    public int processDue() {
        List<CheckoutOutboxEventEntity> events = repository.findDue(utcNow());
        for (CheckoutOutboxEventEntity event : events) {
            try {
                if ("TICKET_ISSUANCE".equals(event.getEventType())) issue(event);
                else if ("ORDER_CONFIRMATION".equals(event.getEventType())) notifyOrder(event);
                event.setStatus("COMPLETED"); event.setLastError(null);
            } catch (Exception e) {
                event.setAttempts(event.getAttempts() + 1);
                event.setLastError(e.getMessage() == null ? e.getClass().getSimpleName()
                        : e.getMessage().substring(0, Math.min(1000, e.getMessage().length())));
                long delay = Math.min(300, 1L << Math.min(8, event.getAttempts()));
                event.setNextAttemptAt(utcNow().plusSeconds(delay));
            }
            repository.save(event);
        }
        return events.size();
    }

    private void issue(CheckoutOutboxEventEntity event) throws Exception {
        ticketService.issueTicketQr(UUID.fromString(event.getPayload()));
    }

    private void notifyOrder(CheckoutOutboxEventEntity event) {
        OrderEntity order = orderService.getOrderById(UUID.fromString(event.getPayload()));
        boolean ready = order.getOrderItems().stream().allMatch(item -> ticketRepository.findById(item.getTicketId())
                .map(ticket -> ticket.getQrCode() != null && !ticket.getQrCode().isBlank()).orElse(false));
        if (!ready) throw new IllegalStateException("Ticket issuance is not complete");

        String email = order.getGuestEmail();
        if (email == null && order.getUserId() != null) {
            email = userRepository.findById(order.getUserId()).map(u -> u.getEmail()).orElse(null);
        }
        NotificationMessage message = new NotificationMessage();
        message.setMessageId(event.getId()); message.setMessageType("ORDER_CONFIRMATION");
        message.setTimestamp(utcNow()); message.setSource("eventpro-api-checkout-outbox");
        NotificationMessage.NotificationPayload payload = new NotificationMessage.NotificationPayload();
        payload.setUserId(order.getUserId()); payload.setOrderId(order.getId()); payload.setOrderNumber(order.getOrderNumber());
        payload.setEmail(email); payload.setDeliveryTypes(List.of("EMAIL"));
        payload.setTemplateData(Map.of("orderNumber", order.getOrderNumber(), "totalAmount", order.getTotalAmount()));
        message.setPayload(payload);
        publisher.publishNotificationMessage(message);
    }

    private static LocalDateTime utcNow() { return LocalDateTime.now(ZoneOffset.UTC); }
}
