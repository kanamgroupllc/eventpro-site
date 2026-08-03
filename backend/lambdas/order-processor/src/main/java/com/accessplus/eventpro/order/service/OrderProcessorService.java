package com.accessplus.eventpro.order.service;

import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.accessplus.eventpro.shared.entity.OrderItemEntity;
import com.accessplus.eventpro.shared.entity.TicketEntity;
import com.accessplus.eventpro.shared.enums.OrderStatus;
import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.model.OrderMessage;
import com.accessplus.eventpro.shared.model.PaymentMessage;
import com.accessplus.eventpro.order.repository.OrderRepository;
import com.accessplus.eventpro.order.repository.TicketRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class OrderProcessorService {

    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final SQSPublisher sqsPublisher;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OrderProcessorService(OrderRepository orderRepository,
                                TicketRepository ticketRepository,
                                SQSPublisher sqsPublisher) {
        this.orderRepository = orderRepository;
        this.ticketRepository = ticketRepository;
        this.sqsPublisher = sqsPublisher;
    }

    @Transactional
    public void processOrder(String messageBody) throws OrderProcessingException {
        try {
            JsonNode rootNode = objectMapper.readTree(messageBody);
            JsonNode payloadNode = rootNode.get("payload");
            if (payloadNode == null) {
                log.debug("No 'payload' field found, attempting direct OrderMessage parsing");
                payloadNode = rootNode;
            }

            OrderMessage orderMessage = objectMapper.treeToValue(payloadNode, OrderMessage.class);
            log.info("Processing order: {} (Order ID: {})", orderMessage.getOrderNumber(), orderMessage.getOrderId());

            OrderEntity order = orderRepository.findByIdWithItems(orderMessage.getOrderId())
                    .orElseThrow(() -> new OrderProcessingException("Order not found: " + orderMessage.getOrderId()));

            validateOrder(order);

            List<UUID> reservedTicketIds = reserveTickets(order);

            try {
                order.setStatus(OrderStatus.PENDING);
                orderRepository.saveAndFlush(order);

                PaymentMessage paymentMessage = createPaymentMessage(order);
                sqsPublisher.publishPaymentMessage(paymentMessage);

                log.info("Order {} validated and published to payment queue", order.getOrderNumber());
            } catch (Exception e) {
                log.error("Error after ticket reservation, rolling back tickets for order: {}", order.getOrderNumber(), e);
                releaseTickets(reservedTicketIds);
                throw new OrderProcessingException("Failed to process order after ticket reservation", e);
            }
        } catch (OrderProcessingException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error processing order message", e);
            throw new OrderProcessingException("Unexpected error processing order", e);
        }
    }

    private void validateOrder(OrderEntity order) throws OrderProcessingException {
        if (order == null) {
            throw new OrderProcessingException("Order is null");
        }
        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            throw new OrderProcessingException("Order has no items: " + order.getOrderNumber());
        }
        if (order.getStatus() != null && order.getStatus() != OrderStatus.PENDING) {
            throw new OrderProcessingException("Order already processed with status: " + order.getStatus());
        }
        log.debug("Order validation passed: {}", order.getOrderNumber());
    }

    private List<UUID> reserveTickets(OrderEntity order) throws OrderProcessingException {
        List<UUID> reservedTicketIds = new ArrayList<>();

        for (OrderItemEntity orderItem : order.getOrderItems()) {
            UUID ticketId = orderItem.getTicketId();
            Integer quantity = orderItem.getQuantity();

            TicketEntity ticket = ticketRepository.findById(ticketId)
                    .orElseThrow(() -> new OrderProcessingException("Ticket not found: " + ticketId));

            if (ticket.getTicketStatus() != TicketStatus.AVAILABLE) {
                throw new OrderProcessingException(
                        String.format("Ticket %s is not available (status: %s)", ticketId, ticket.getTicketStatus()));
            }

            ticket.setTicketStatus(TicketStatus.RESERVED);
            ticketRepository.saveAndFlush(ticket);
            reservedTicketIds.add(ticketId);

            log.debug("Reserved ticket {} for order {} (quantity: {})", ticketId, order.getOrderNumber(), quantity);
        }

        log.info("Reserved {} tickets for order {}", reservedTicketIds.size(), order.getOrderNumber());
        return reservedTicketIds;
    }

    private void releaseTickets(List<UUID> ticketIds) {
        for (UUID ticketId : ticketIds) {
            try {
                ticketRepository.releaseTicket(ticketId);
                log.debug("Released ticket: {}", ticketId);
            } catch (Exception e) {
                log.error("Error releasing ticket: {}", ticketId, e);
            }
        }
    }

    private PaymentMessage createPaymentMessage(OrderEntity order) {
        PaymentMessage message = new PaymentMessage();
        message.setOrderId(order.getId());
        message.setOrderNumber(order.getOrderNumber());
        message.setUserId(order.getUserId());
        message.setTotalAmount(order.getTotalAmount());
        return message;
    }

    public static class OrderProcessingException extends Exception {
        public OrderProcessingException(String message) {
            super(message);
        }

        public OrderProcessingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
