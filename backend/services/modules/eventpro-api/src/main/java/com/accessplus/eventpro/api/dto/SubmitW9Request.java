package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * W-9 submission for 1099-K compliance. In production, use Stripe Tax or partner for TIN storage.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitW9Request {

    @NotBlank(message = "Legal name is required")
    private String legalName;

    private String businessName;

    @NotBlank
    @Pattern(regexp = "SSN|EIN", message = "Must be SSN or EIN")
    private String tinType;

    /** Last 4 of SSN or full EIN (for demo; in production use tokenization). */
    @NotBlank(message = "TIN is required")
    private String tin;

    /** Acknowledgment that info is correct (digital signature placeholder). */
    private Boolean signatureAcknowledged;
}
