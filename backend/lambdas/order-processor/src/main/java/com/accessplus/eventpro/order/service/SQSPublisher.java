package com.accessplus.eventpro.order.service;

import com.accessplus.eventpro.order.config.SQSConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

@Service
public class SQSPublisher {

    private static final Logger LOG = LoggerFactory.getLogger(SQSPublisher.class);

    private final SqsClient sqsClient;
    private final SQSConfig sqsConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SQSPublisher(SqsClient sqsClient, SQSConfig sqsConfig) {
        this.sqsClient = sqsClient;
        this.sqsConfig = sqsConfig;
    }

    public void publishPaymentMessage(Object message) {
        try {
            String messageBody = objectMapper.writeValueAsString(message);
            String queueUrl = sqsConfig.getPaymentQueueUrl();

            if (queueUrl == null || queueUrl.isEmpty()) {
                LOG.warn("Payment queue URL not configured, skipping message publish");
                return;
            }

            sqsClient.sendMessage(SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(messageBody)
                    .build());
            LOG.info("Payment message published to queue: {}", queueUrl);
        } catch (Exception e) {
            LOG.error("Error publishing payment message to queue: {}", sqsConfig.getPaymentQueueUrl(), e);
            throw new RuntimeException("Failed to publish payment message", e);
        }
    }
}
