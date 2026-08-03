package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSubscriptionCheckoutRequest {

    @NotBlank(message = "Tier is required")
    @Pattern(regexp = "^(?i)(PRO|ENTERPRISE)$", message = "Tier must be PRO or ENTERPRISE")
    private String tier;

    @Pattern(regexp = "^(?i)(MONTHLY|YEARLY)$", message = "Period must be MONTHLY or YEARLY")
    private String period = "MONTHLY";

    @NotBlank(message = "Success URL is required")
    private String successUrl;

    @NotBlank(message = "Cancel URL is required")
    private String cancelUrl;
}
