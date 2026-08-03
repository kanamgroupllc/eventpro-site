package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpgradeSubscriptionRequest {

    @NotBlank(message = "Tier is required")
    @Pattern(regexp = "^(?i)(PRO|ENTERPRISE)$", message = "Tier must be PRO or ENTERPRISE")
    private String tier;
}
