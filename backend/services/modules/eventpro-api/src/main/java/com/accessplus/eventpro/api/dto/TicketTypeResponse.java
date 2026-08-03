package com.accessplus.eventpro.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TicketTypeResponse {
    
    private String id; // Ticket type enum name as ID
    private UUID eventId;
    private String name; // Ticket type enum name
    private String description;
    private BigDecimal price;
    private Integer totalQuantity;
    private Integer availableQuantity;
    private Integer reservedQuantity;
    private Integer soldQuantity;
    private LocalDateTime saleStartDate;
    private LocalDateTime saleEndDate;
    private String status; // "ACTIVE", "INACTIVE", "SOLD_OUT"
}
