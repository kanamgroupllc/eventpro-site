package com.accessplus.eventpro.api.payout.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConnectOnboardingRequest {
    /** URL to redirect the user to after completing Connect onboarding. */
    @NotBlank(message = "returnUrl is required")
    private String returnUrl;
    /** URL to redirect the user to if the onboarding link expires (e.g. to get a new link). */
    @NotBlank(message = "refreshUrl is required")
    private String refreshUrl;
}
