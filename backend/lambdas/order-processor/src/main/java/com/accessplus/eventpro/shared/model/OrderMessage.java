package com.accessplus.eventpro.shared.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderMessage {

    @JsonProperty("orderId")
    private UUID orderId;

    @JsonProperty("orderNumber")
    private String orderNumber;

    @JsonProperty("userId")
    private UUID userId;

    @JsonProperty("totalAmount")
    private BigDecimal totalAmount;

}
