package com.accessplus.eventpro.api.dto;

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
public class AttendeeResponse {
    
    private UUID ticketId;
    private UUID userId;
    private String firstName;
    private String lastName;
    private String email;
    private String ticketType;
    private BigDecimal ticketPrice;
    private LocalDateTime purchaseDate;
    private Boolean checkedIn;
    private LocalDateTime checkedInAt;
}

