package com.accessplus.eventpro.api.dto;

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
public class EventSaleResponse {
    
    private UUID eventId;
    private String eventName;
    private Long ticketsSold;
    private BigDecimal revenue;
    private Long availableTickets;
    private Long totalTickets;
}

