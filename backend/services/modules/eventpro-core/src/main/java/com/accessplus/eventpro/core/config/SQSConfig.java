package com.accessplus.eventpro.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;

import java.net.URI;

@Configuration
public class SQSConfig {

    @Value("${aws.region:us-east-1}")
    private String awsRegion;

    @Value("${aws.sqs.endpoint:}")
    private String sqsEndpoint; // Optional: for LocalStack or custom endpoints

    @Value("${aws.sqs.orderQueueUrl:}")
    private String orderQueueUrl;

    @Value("${aws.sqs.paymentQueueUrl:}")
    private String paymentQueueUrl;

    @Value("${aws.sqs.notificationQueueUrl:}")
    private String notificationQueueUrl;

    @Bean
    public SqsClient sqsClient() {
        var builder = SqsClient.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(DefaultCredentialsProvider.builder().build());

        // Configure custom endpoint if provided (for LocalStack)
        if (sqsEndpoint != null && !sqsEndpoint.isEmpty()) {
            builder.endpointOverride(URI.create(sqsEndpoint));
        }

        return builder.build();
    }

    public String getOrderQueueUrl() {
        return orderQueueUrl;
    }

    public String getPaymentQueueUrl() {
        return paymentQueueUrl;
    }

    public String getNotificationQueueUrl() {
        return notificationQueueUrl;
    }
}

