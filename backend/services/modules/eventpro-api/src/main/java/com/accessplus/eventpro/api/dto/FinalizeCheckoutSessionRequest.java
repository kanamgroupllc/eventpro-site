package com.accessplus.eventpro.api.dto;

import lombok.Data;

@Data
public class FinalizeCheckoutSessionRequest {
    private String paymentIntentId;
    private String resumeToken;
}
