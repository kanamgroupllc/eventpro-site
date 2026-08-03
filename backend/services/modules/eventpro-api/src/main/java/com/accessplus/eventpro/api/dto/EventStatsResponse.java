package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventStatsResponse {
    
    private Long ticketsSold;
    private Long ticketsAvailable;
    private Long totalTickets;
    private BigDecimal revenue;
    private Long attendees;
    private Long checkedIn;
}

