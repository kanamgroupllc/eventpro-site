package com.accessplus.eventpro.api.wallet.dto;

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
public class WalletLedgerEntryResponse {
    private UUID id;
    private BigDecimal amount;
    private String entryType;
    private String referenceType;
    private UUID referenceId;
    private String description;
    private BigDecimal balanceAfter;
    private Instant createdAt;
}
