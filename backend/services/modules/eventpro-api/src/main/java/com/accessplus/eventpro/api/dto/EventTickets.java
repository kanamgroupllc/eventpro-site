package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.shared.enums.TicketType;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EventTickets {
    
    private TicketType ticketType;
    private BigDecimal price;
    private Integer count;
}

