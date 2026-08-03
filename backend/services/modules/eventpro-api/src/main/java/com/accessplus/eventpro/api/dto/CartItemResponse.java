package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.shared.enums.TicketStatus;
import com.accessplus.eventpro.shared.enums.TicketType;
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
public class CartItemResponse {
    /** GENERAL_ADMISSION rows are grouped; SEAT rows always have quantity one. */
    private String kind;
    private UUID id;
    private UUID ticketId;
    private UUID eventId;
    private String name;
    private TicketType ticketType;
    private TicketStatus ticketStatus;
    private BigDecimal price;
    private BigDecimal unitPrice;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String eventIdType; // Event ID as string for legacy API compatibility
    private Integer quantity; // Quantity of this ticket in cart
    private String expiresAt;
}
