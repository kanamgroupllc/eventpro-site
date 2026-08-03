package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingVerificationResponse {
    private UUID id;
    private UUID userId;
    private String email;
    private String legalEntityType;
    private String addressCity;
    private String addressState;
    private Instant submittedAt;
    private String status;
}
