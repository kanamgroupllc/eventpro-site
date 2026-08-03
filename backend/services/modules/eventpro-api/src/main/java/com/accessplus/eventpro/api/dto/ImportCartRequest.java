package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.shared.enums.TicketType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ImportCartRequest {
    @NotEmpty
    @Valid
    private List<Line> items;

    @Data
    public static class Line {
        @NotNull private UUID eventId;
        private TicketType ticketType;
        private UUID ticketId;
        @NotNull @Min(1) @Max(4) private Integer quantity;
    }
}
