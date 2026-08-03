package com.accessplus.eventpro.payment.service;

import com.accessplus.eventpro.payment.repository.OrderRepository;
import com.accessplus.eventpro.payment.repository.TicketRepository;
import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.entity.OrderItemEntity;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.NotificationType;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.model.NotificationMessage;
import com.accessplus.eventpro.shared.model.PaymentMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentProcessorService {

    private static final Logger LOG = LoggerFactory.getLogger(PaymentProcessorService.class);

    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final StripeService stripeService;
    private final SQSPublisher sqsPublisher;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PaymentProcessorService(OrderRepository orderRepository,
                                   TicketRepository ticketRepository,
                                   StripeService stripeService,
                                   SQSPublisher sqsPublisher) {
        this.orderRepository = orderRepository;
        this.ticketRepository = ticketRepository;
        this.stripeService = stripeService;
        this.sqsPublisher = sqsPublisher;
    }

    @Transactional
    public void processPayment(String messageBody) throws PaymentProcessingException {
        try {
            JsonNode rootNode = objectMapper.readTree(messageBody);
            JsonNode payloadNode = rootNode.get("payload");
            if (payloadNode == null) {
                payloadNode = rootNode;
            }

            PaymentMessage paymentMessage = objectMapper.treeToValue(payloadNode, PaymentMessage.class);
            LOG.info("Processing payment: Order ID={}, Order Number={}",
                    paymentMessage.getOrderId(), paymentMessage.getOrderNumber());

            OrderEntity order = orderRepository.findByIdWithItems(paymentMessage.getOrderId())
                    .orElseThrow(() -> new PaymentProcessingException("Order not found: " + paymentMessage.getOrderId()));

            validateOrder(order, paymentMessage);

            boolean paymentSucceeded = processStripePayment(paymentMessage);

            if (paymentSucceeded) {
                orderRepository.updateOrderStatus(order.getId(), OrderStatus.PAID);
                assignTickets(order);
                publishNotificationMessage(order, NotificationType.PAYMENT_SUCCESS);
                LOG.info("Payment processed successfully for order: {}", order.getOrderNumber());
            } else {
                handlePaymentFailure(order);
                LOG.warn("Payment failed for order: {}", order.getOrderNumber());
            }
        } catch (PaymentProcessingException e) {
            throw e;
        } catch (Exception e) {
            LOG.error("Unexpected error processing payment message", e);
            throw new PaymentProcessingException("Unexpected error processing payment", e);
        }
    }

    private void validateOrder(OrderEntity order, PaymentMessage paymentMessage) throws PaymentProcessingException {
        if (order == null) {
            throw new PaymentProcessingException("Order is null");
        }
        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            throw new PaymentProcessingException("Order has no items: " + order.getOrderNumber());
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new PaymentProcessingException("Order is not in PENDING status: " + order.getStatus());
        }
        if (order.getTotalAmount().compareTo(paymentMessage.getTotalAmount()) != 0) {
            throw new PaymentProcessingException(
                    String.format("Order amount mismatch: order=%s, message=%s",
                            order.getTotalAmount(), paymentMessage.getTotalAmount()));
        }
    }

    private boolean processStripePayment(PaymentMessage paymentMessage) {
        try {
            String clientSecret = stripeService.createPaymentIntent(paymentMessage.getTotalAmount());

            String paymentIntentId = null;
            if (clientSecret != null && clientSecret.contains("_secret_")) {
                paymentIntentId = clientSecret.substring(0, clientSecret.indexOf("_secret_"));
            }

            if (paymentIntentId == null) {
                LOG.error("Could not extract payment intent ID from client secret for order: {}",
                        paymentMessage.getOrderNumber());
                return false;
            }

            boolean confirmed = stripeService.confirmPaymentIntent(paymentIntentId);
            if (confirmed) {
                LOG.info("Payment confirmed successfully for order: {}, paymentIntentId: {}",
                        paymentMessage.getOrderNumber(), paymentIntentId);
            } else {
                LOG.warn("Payment confirmation failed for order: {}, paymentIntentId: {}",
                        paymentMessage.getOrderNumber(), paymentIntentId);
            }
            return confirmed;
        } catch (Exception e) {
            LOG.error("Error processing Stripe payment for order: {}", paymentMessage.getOrderNumber(), e);
            return false;
        }
    }

    private void assignTickets(OrderEntity order) {
        for (OrderItemEntity orderItem : order.getOrderItems()) {
            UUID ticketId = orderItem.getTicketId();
            Integer quantity = orderItem.getQuantity();

            TicketEntity ticket = ticketRepository.findById(ticketId)
                    .orElseThrow(() -> new RuntimeException("Ticket not found: " + ticketId));

            ticket.setPurchaserId(order.getUserId());
            ticket.setTicketStatus(TicketStatus.SOLD);
            ticketRepository.saveAndFlush(ticket);

            LOG.debug("Assigned ticket {} to user {} for order {} (quantity: {})",
                    ticketId, order.getUserId(), order.getOrderNumber(), quantity);
        }
        LOG.info("Assigned tickets for order: {}", order.getOrderNumber());
    }

    private void releaseTickets(OrderEntity order) {
        List<TicketEntity> tickets = ticketRepository.findByOrderId(order.getId());
        for (TicketEntity ticket : tickets) {
            ticket.setTicketStatus(TicketStatus.AVAILABLE);
            ticket.setPurchaserId(null);
            ticketRepository.save(ticket);
        }
        ticketRepository.flush();
        LOG.info("Released tickets for order: {}", order.getOrderNumber());
    }

    private void handlePaymentFailure(OrderEntity order) {
        orderRepository.updateOrderStatus(order.getId(), OrderStatus.CANCELLED);
        releaseTickets(order);
        publishNotificationMessage(order, NotificationType.PAYMENT_FAILED);
    }

    private void publishNotificationMessage(OrderEntity order, NotificationType messageType) {
        try {
            NotificationMessage notificationMessage = createNotificationMessage(order, messageType);
            sqsPublisher.publishNotificationMessage(notificationMessage);
            LOG.debug("Published notification message: type={}, order={}", messageType, order.getOrderNumber());
        } catch (Exception e) {
            LOG.error("Error publishing notification message for order: {}", order.getOrderNumber(), e);
        }
    }

    private NotificationMessage createNotificationMessage(OrderEntity order, NotificationType messageType) {
        NotificationMessage message = new NotificationMessage();
        message.setMessageId(UUID.randomUUID());
        message.setMessageType(messageType.name());
        message.setTimestamp(LocalDateTime.now());
        message.setSource("payment-processor");

        NotificationMessage.NotificationPayload payload = new NotificationMessage.NotificationPayload();
        payload.setUserId(order.getUserId());
        payload.setOrderId(order.getId());
        payload.setOrderNumber(order.getOrderNumber());
        payload.setDeliveryTypes(Arrays.asList("EMAIL", "SMS", "IN_APP"));

        Map<String, Object> templateData = new HashMap<>();
        templateData.put("orderNumber", order.getOrderNumber());
        templateData.put("totalAmount", order.getTotalAmount());
        payload.setTemplateData(templateData);

        message.setPayload(payload);
        return message;
    }

    public static class PaymentProcessingException extends Exception {
        public PaymentProcessingException(String message) {
            super(message);
        }

        public PaymentProcessingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
