package com.accessplus.eventpro.api.payout.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayoutRequestResponse {
    private UUID id;
    private BigDecimal amount;
    private String status;
    private Instant requestedAt;
    private Instant completedAt;
}
