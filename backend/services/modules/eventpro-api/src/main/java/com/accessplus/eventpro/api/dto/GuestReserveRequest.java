package com.accessplus.eventpro.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestReserveRequest {

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<GuestOrderItemRequest> items;

    /** Optional Google reCAPTCHA token when eventpro.recaptcha.enabled=true */
    private String recaptchaToken;
}
