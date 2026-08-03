package com.accessplus.eventpro.shared.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public class PaymentMessage {

    @JsonProperty("orderId")
    private UUID orderId;

    @JsonProperty("orderNumber")
    private String orderNumber;

    @JsonProperty("userId")
    private UUID userId;

    @JsonProperty("totalAmount")
    private java.math.BigDecimal totalAmount;

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public java.math.BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(java.math.BigDecimal totalAmount) { this.totalAmount = totalAmount; }
}
