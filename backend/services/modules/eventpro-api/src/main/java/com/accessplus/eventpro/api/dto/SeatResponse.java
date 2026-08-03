package com.accessplus.eventpro.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SeatResponse {
    private UUID id;
    private String section;
    private String row;
    private Integer seatNumber;
    private BigDecimal price;
    /** AVAILABLE, RESERVED, SOLD */
    private String status;
}
