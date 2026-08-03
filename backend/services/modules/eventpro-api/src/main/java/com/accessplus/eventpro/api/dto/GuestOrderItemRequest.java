package com.accessplus.eventpro.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestOrderItemRequest {

    @NotNull(message = "Event ID is required")
    private UUID eventId;

    @NotBlank(message = "Ticket type is required")
    private String ticketType;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 4, message = "Quantity cannot exceed 4")
    private Integer quantity;
}
