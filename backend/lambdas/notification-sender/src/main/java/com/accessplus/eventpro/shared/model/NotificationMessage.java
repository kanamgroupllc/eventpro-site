package com.accessplus.eventpro.shared.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public class NotificationMessage {

    @JsonProperty("schemaVersion")
    private int schemaVersion = 1;

    @JsonProperty("messageId")
    private UUID messageId;

    @JsonProperty("messageType")
    private String messageType;

    @JsonProperty("timestamp")
    private String timestamp;

    @JsonProperty("source")
    private String source;

    @JsonProperty("payload")
    private NotificationPayload payload;

    public int getSchemaVersion() { return schemaVersion; }
    public void setSchemaVersion(int schemaVersion) { this.schemaVersion = schemaVersion; }
    public UUID getMessageId() { return messageId; }
    public void setMessageId(UUID messageId) { this.messageId = messageId; }
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
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
        @JsonProperty("manifestKey") private String manifestKey;
        @JsonProperty("subject") private String subject;
        @JsonProperty("textBody") private String textBody;
        @JsonProperty("replyTo") private String replyTo;

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
        public String getManifestKey() { return manifestKey; }
        public void setManifestKey(String manifestKey) { this.manifestKey = manifestKey; }
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
        public String getTextBody() { return textBody; }
        public void setTextBody(String textBody) { this.textBody = textBody; }
        public String getReplyTo() { return replyTo; }
        public void setReplyTo(String replyTo) { this.replyTo = replyTo; }
    }
}
