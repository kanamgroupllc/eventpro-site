package com.accessplus.eventpro.api.dto;

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
public class TicketUpdateRequest {
    
    private String name;
    private String description; // Not stored in TicketEntity, but in API contract
    private BigDecimal price;
    private Long quantity; // Not applicable for single ticket, but in API contract
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String printOutUrl;
    private UUID eventId;
    private TicketType ticketType; // Not in README but useful for updates
}

