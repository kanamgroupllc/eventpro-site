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
public class SubmitVerificationRequest {

    /** INDIVIDUAL (SSN) or BUSINESS (EIN). */
    @NotBlank
    @Pattern(regexp = "INDIVIDUAL|BUSINESS", message = "Must be INDIVIDUAL or BUSINESS")
    private String legalEntityType;

    /** Last 4 digits of SSN for individuals (1099-K reporting). Required when legalEntityType=INDIVIDUAL. */
    @Pattern(regexp = "\\d{4}", message = "SSN last 4 must be exactly 4 digits")
    private String ssnLast4;

    /** Employer Identification Number for businesses. Required when legalEntityType=BUSINESS. */
    @Pattern(regexp = "[0-9-]{9,20}", message = "EIN must be 9 digits (with optional hyphens)")
    private String ein;

    @NotBlank(message = "Street address is required")
    private String addressStreet;

    @NotBlank(message = "City is required")
    private String addressCity;

    @NotBlank(message = "State is required")
    private String addressState;

    @NotBlank(message = "ZIP code is required")
    private String addressZip;

    /** Session ID from Stripe Identity or Persona after document capture. */
    private String idSessionId;

    /** Provider name e.g. STRIPE_IDENTITY, PERSONA. */
    private String idProvider;
}
