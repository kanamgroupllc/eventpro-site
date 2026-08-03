package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.shared.entity.OrderEntity;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrderResponse {

    private UUID id;
    private UUID userId;
    private Long amount; // Order total amount in cents (for legacy API compatibility)
    private BigDecimal taxAmount; // Sales tax / VAT amount for this order (0 when not applied)
    private String status; // PENDING, COMPLETED, CANCELLED, REFUNDED
    private LocalDateTime orderDate;
    private List<OrderItemResponse> orderItems;
    private PaymentResponse payment;

    public static OrderResponse fromEntity(OrderEntity entity) {
        if (entity == null) {
            return null;
        }

        // Convert BigDecimal to Long (cents) for legacy API compatibility
        Long amountInCents = entity.getTotalAmount() != null
                ? entity.getTotalAmount().multiply(java.math.BigDecimal.valueOf(100)).longValue()
                : 0L;

        // Convert order items
        List<OrderItemResponse> orderItemResponses = new ArrayList<>();
        if (entity.getOrderItems() != null) {
            orderItemResponses = entity.getOrderItems().stream()
                    .map(OrderItemResponse::fromEntity)
                    .collect(Collectors.toList());
        }

        String statusStr = entity.getStatus() != null ? entity.getStatus().name() : null;

        return OrderResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .amount(amountInCents)
                .taxAmount(entity.getTaxAmount() != null ? entity.getTaxAmount() : BigDecimal.ZERO)
                .status(statusStr)
                .orderDate(entity.getOrderDate())
                .orderItems(orderItemResponses)
                .payment(null) // Payment will be populated when PaymentEntity is available
                .build();
    }
}

