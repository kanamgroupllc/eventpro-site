package com.accessplus.eventpro.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TicketCreateRequest {
    
    @NotNull(message = "Event ID is required")
    private UUID eventId;
    
    @NotEmpty(message = "At least one ticket must be specified")
    @Valid
    private List<TicketInfo> tickets;
}

