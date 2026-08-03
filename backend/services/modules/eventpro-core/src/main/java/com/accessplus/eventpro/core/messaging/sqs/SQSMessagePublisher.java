package com.accessplus.eventpro.core.messaging.sqs;

import com.accessplus.eventpro.core.config.SQSConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

@Slf4j
@Component
@RequiredArgsConstructor
public class SQSMessagePublisher {
    private final SqsClient sqsClient;
    private final SQSConfig sqsConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public void publish(String queueUrl, Object message) {
        try {
            String messageBody = objectMapper.writeValueAsString(message);
            
            SendMessageRequest request = SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(messageBody)
                .build();
            
            sqsClient.sendMessage(request);
            log.info("Message published to queue: {}", queueUrl);
        } catch (Exception e) {
            log.error("Error publishing message to queue: {}", queueUrl, e);
            throw new RuntimeException("Failed to publish message", e);
        }
    }
    
    public void publishOrderMessage(Object message) {
        String queueUrl = sqsConfig.getOrderQueueUrl();
        log.debug("Publishing order message to order-queue: {}", queueUrl);
        publish(queueUrl, message);
    }
    
    public void publishPaymentMessage(Object message) {
        String queueUrl = sqsConfig.getPaymentQueueUrl();
        log.debug("Publishing payment message to payment-queue: {}", queueUrl);
        publish(queueUrl, message);
    }
    
    public void publishNotificationMessage(Object message) {
        String queueUrl = sqsConfig.getNotificationQueueUrl();
        log.debug("Publishing notification message to notification-queue: {}", queueUrl);
        publish(queueUrl, message);
    }
}

