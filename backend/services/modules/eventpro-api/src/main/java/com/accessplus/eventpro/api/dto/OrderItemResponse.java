package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.shared.entity.OrderItemEntity;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrderItemResponse {
    
    private UUID id;
    private Integer quantity;
    private BigDecimal price;
    private TicketResponse ticket;
    
    public static OrderItemResponse fromEntity(OrderItemEntity entity) {
        if (entity == null) {
            return null;
        }
        
        return OrderItemResponse.builder()
                .id(entity.getId())
                .quantity(entity.getQuantity())
                .price(entity.getPrice())
                .ticket(entity.getTicket() != null ? TicketResponse.fromEntity(entity.getTicket()) : null)
                .build();
    }
}

