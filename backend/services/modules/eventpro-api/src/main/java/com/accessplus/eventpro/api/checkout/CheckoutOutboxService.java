package com.accessplus.eventpro.api.checkout;

import com.accessplus.eventpro.core.messaging.sqs.SQSMessagePublisher;
import com.accessplus.eventpro.core.user.repository.UserRepository;
import com.accessplus.eventpro.order.order.service.OrderService;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import com.accessplus.eventpro.shared.model.NotificationMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutOutboxService {
    private final CheckoutOutboxRepository repository;
    private final CheckoutOutboxStateService stateService;
    private final TicketArtifactService artifactService;
    private final OrderService orderService;
    private final UserRepository userRepository;
    private final SQSMessagePublisher publisher;
    private final ObjectMapper objectMapper;

    public void enqueueIssuance(OrderEntity order) {
        order.getOrderItems().forEach(item -> enqueue("TICKET_ISSUANCE", item.getTicketId().toString(),
                json(new TicketIssuancePayload(2, item.getTicketId(), order.getId()))));
        enqueue("ORDER_CONFIRMATION", order.getId().toString(), order.getId().toString());
    }

    private void enqueue(String type, String aggregate, String payload) {
        CheckoutOutboxEventEntity event = new CheckoutOutboxEventEntity();
        event.setEventType(type);
        event.setAggregateId(aggregate);
        event.setPayload(payload);
        event.setStatus("PENDING");
        event.setNextAttemptAt(utcNow());
        repository.save(event);
    }

    public int processDue() {
        List<CheckoutOutboxEventEntity> events = stateService.claimDue();
        for (CheckoutOutboxEventEntity event : events) {
            try {
                if ("TICKET_ISSUANCE".equals(event.getEventType())) issue(event);
                else if ("ORDER_CONFIRMATION".equals(event.getEventType())) notifyOrder(event);
                else throw new PermanentOutboxException("Unknown checkout outbox event: " + event.getEventType());
                stateService.complete(event.getId());
            } catch (PermanentOutboxException error) {
                log.error("Checkout outbox event permanently failed: eventId={}, type={}",
                        event.getId(), event.getEventType(), error);
                stateService.fail(event.getId(), error, true);
            } catch (Exception error) {
                boolean permanent = isPermanent(error);
                if (permanent) {
                    log.error("Checkout outbox event permanently failed: eventId={}, type={}",
                            event.getId(), event.getEventType(), error);
                } else {
                    log.warn("Checkout outbox event will retry: eventId={}, type={}",
                            event.getId(), event.getEventType(), error);
                }
                stateService.fail(event.getId(), error, permanent);
            }
        }
        return events.size();
    }

    private void issue(CheckoutOutboxEventEntity event) throws Exception {
        TicketIssuancePayload payload;
        try {
            payload = objectMapper.readValue(event.getPayload(), TicketIssuancePayload.class);
        } catch (Exception legacyPayload) {
            UUID ticketId = UUID.fromString(event.getPayload());
            artifactService.issueLegacy(ticketId);
            return;
        }
        artifactService.issue(payload.ticketId(), payload.orderId());
    }

    private void notifyOrder(CheckoutOutboxEventEntity event) throws Exception {
        OrderEntity order = orderService.getOrderById(UUID.fromString(event.getPayload()));
        String email = order.getGuestEmail();
        if ((email == null || email.isBlank()) && order.getUserId() != null) {
            email = userRepository.findById(order.getUserId()).map(user -> user.getEmail()).orElse(null);
        }
        if (email == null || email.isBlank()) throw new PermanentOutboxException("Order has no recipient email");
        String manifestKey = artifactService.createOrderManifest(order.getId());

        NotificationMessage message = new NotificationMessage();
        message.setSchemaVersion(2);
        message.setMessageId(event.getId());
        message.setMessageType("ORDER_TICKETS");
        message.setTimestamp(Instant.now().toString());
        message.setSource("eventpro-api-checkout-outbox");
        NotificationMessage.NotificationPayload payload = new NotificationMessage.NotificationPayload();
        payload.setOrderId(order.getId());
        payload.setOrderNumber(order.getOrderNumber());
        payload.setManifestKey(manifestKey);
        message.setPayload(payload);
        publisher.publishNotificationMessage(message);
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception error) {
            throw new IllegalStateException("Unable to serialize checkout outbox payload", error);
        }
    }

    private static LocalDateTime utcNow() { return LocalDateTime.now(ZoneOffset.UTC); }

    private static boolean isPermanent(Exception error) {
        return error instanceof IllegalArgumentException || error instanceof ResourceNotFoundException;
    }

    private record TicketIssuancePayload(int schemaVersion, UUID ticketId, UUID orderId) {}

    private static final class PermanentOutboxException extends Exception {
        private PermanentOutboxException(String message) { super(message); }
    }
}
