package com.accessplus.eventpro.shared.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class NotificationMessage {

    @JsonProperty("messageId")
    private UUID messageId;

    @JsonProperty("messageType")
    private String messageType;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @JsonProperty("source")
    private String source;

    @JsonProperty("payload")
    private NotificationPayload payload;

    public UUID getMessageId() { return messageId; }
    public void setMessageId(UUID messageId) { this.messageId = messageId; }
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public NotificationPayload getPayload() { return payload; }
    public void setPayload(NotificationPayload payload) { this.payload = payload; }

    public static class NotificationPayload {
        @JsonProperty("userId") private UUID userId;
        @JsonProperty("orderId") private UUID orderId;
        @JsonProperty("orderNumber") private String orderNumber;
        @JsonProperty("deliveryTypes") private List<String> deliveryTypes;
        @JsonProperty("email") private String email;
        @JsonProperty("phoneNumber") private String phoneNumber;
        @JsonProperty("templateData") private Map<String, Object> templateData;

        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }
        public UUID getOrderId() { return orderId; }
        public void setOrderId(UUID orderId) { this.orderId = orderId; }
        public String getOrderNumber() { return orderNumber; }
        public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
        public List<String> getDeliveryTypes() { return deliveryTypes; }
        public void setDeliveryTypes(List<String> deliveryTypes) { this.deliveryTypes = deliveryTypes; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
        public Map<String, Object> getTemplateData() { return templateData; }
        public void setTemplateData(Map<String, Object> templateData) { this.templateData = templateData; }
    }
}
