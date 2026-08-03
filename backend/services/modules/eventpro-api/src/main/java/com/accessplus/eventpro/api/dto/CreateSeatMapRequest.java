package com.accessplus.eventpro.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSeatMapRequest {

    @Valid
    @NotEmpty(message = "At least one section is required")
    private List<SeatSectionDto> sections;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatSectionDto {
        @NotNull(message = "Section name is required")
        private String name;

        @NotNull
        @Min(1)
        private Integer rowCount;

        @NotNull
        @Min(1)
        private Integer seatsPerRow;

        @NotNull
        private BigDecimal price;
    }
}
