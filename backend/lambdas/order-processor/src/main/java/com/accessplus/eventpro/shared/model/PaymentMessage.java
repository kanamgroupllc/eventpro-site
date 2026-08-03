package com.accessplus.eventpro.shared.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PaymentMessage {

    @JsonProperty("orderId")
    private UUID orderId;

    @JsonProperty("orderNumber")
    private String orderNumber;

    @JsonProperty("userId")
    private UUID userId;

    @JsonProperty("totalAmount")
    private java.math.BigDecimal totalAmount;

}
