package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecordSubscriptionPaymentRequest {

    @NotNull
    private UUID userId;

    @NotNull
    @DecimalMin(value = "0", message = "Amount must be non-negative")
    private BigDecimal amount;

    /** PRO or ENTERPRISE */
    private String tier = "PRO";

    /** MONTHLY or YEARLY */
    private String period = "MONTHLY";
}
