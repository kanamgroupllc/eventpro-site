package com.accessplus.eventpro.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestConfirmPaymentRequest {

    @NotBlank(message = "Payment intent ID is required")
    private String paymentIntentId;

    @NotBlank(message = "Email is required")
    private String email;

    private String firstName;
    private String lastName;

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<GuestOrderItemRequest> items;

    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "0.01", message = "Total amount must be positive")
    private BigDecimal totalAmount;

    /** Optional donation amount (included in total). Pro/Enterprise events with donations enabled. */
    @DecimalMin(value = "0", message = "Donation must be non-negative")
    private BigDecimal donationAmount;

    /** Optional: ticket IDs from guest-reserve (lock). When set, order uses these instead of reserving again. */
    private List<UUID> reservedTicketIds;

    /** Optional: attribution for cultural taxonomy / discovery (e.g. "Social media", "Friend", "Search"). */
    private String howDidYouHear;

    /** Optional: send ticket via WhatsApp when true. */
    private Boolean receiveTicketViaWhatsApp;

    /** Optional: send ticket via SMS when true. */
    private Boolean receiveTicketViaSMS;

    /** Optional: phone number for SMS / WhatsApp ticket delivery. */
    private String phone;

    /** Optional: buyer state (e.g. CA, NY) for sales tax jurisdiction. */
    private String state;

    /** Optional: buyer country (e.g. US). */
    private String country;

    /** Optional: tax amount when state/country was used at checkout (so order stores it). */
    private BigDecimal taxAmount;

    /** Optional Google reCAPTCHA token when eventpro.recaptcha.enabled=true */
    private String recaptchaToken;
}
