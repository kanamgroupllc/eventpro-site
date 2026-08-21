package com.accessplus.eventpro.notification.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DeliveryLedger {
    private final DynamoDbClient dynamoDb;
    private final String table;
    private final Set<String> localSent = ConcurrentHashMap.newKeySet();

    public DeliveryLedger(DynamoDbClient dynamoDb, @Value("${delivery-ledger.table:}") String table) {
        this.dynamoDb = dynamoDb;
        this.table = table;
    }

    public boolean isSent(String deliveryKey) {
        if (table == null || table.isBlank()) return localSent.contains(deliveryKey);
        var response = dynamoDb.getItem(GetItemRequest.builder().tableName(table).consistentRead(true)
                .key(Map.of("delivery_key", AttributeValue.fromS(deliveryKey))).build());
        return response.hasItem() && "SENT".equals(response.item().get("status").s());
    }

    public void markSent(String deliveryKey, String messageType, String providerMessageId) {
        if (table == null || table.isBlank()) {
            localSent.add(deliveryKey);
            return;
        }
        try {
            dynamoDb.putItem(PutItemRequest.builder().tableName(table)
                    .conditionExpression("attribute_not_exists(delivery_key)")
                    .item(Map.of(
                            "delivery_key", AttributeValue.fromS(deliveryKey),
                            "status", AttributeValue.fromS("SENT"),
                            "message_type", AttributeValue.fromS(messageType),
                            "provider_message_id", AttributeValue.fromS(providerMessageId),
                            "sent_at", AttributeValue.fromS(Instant.now().toString())))
                    .build());
        } catch (ConditionalCheckFailedException duplicate) {
            if (!isSent(deliveryKey)) throw duplicate;
        }
    }
}
