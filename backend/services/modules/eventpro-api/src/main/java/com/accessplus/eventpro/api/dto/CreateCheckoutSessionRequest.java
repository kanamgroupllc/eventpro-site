package com.accessplus.eventpro.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class CreateCheckoutSessionRequest {
    @NotBlank @Size(max = 100) private String idempotencyKey;
    @Valid private List<GuestOrderItemRequest> items = new ArrayList<>();
    @Email private String email;
    private String firstName;
    private String lastName;
    private String state;
    private String country;
    @DecimalMin("0.00") private BigDecimal donationAmount = BigDecimal.ZERO;
    @DecimalMin("0.00") private BigDecimal walletAmount = BigDecimal.ZERO;
    @Valid private List<AddonSelection> addOns = new ArrayList<>();
    private String recaptchaToken;

    @Data
    public static class AddonSelection {
        @NotNull private UUID id;
        @NotNull @Min(1) @Max(20) private Integer quantity;
        private String size;
    }
}
