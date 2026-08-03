package com.accessplus.eventpro.order.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SQSConfig {

    @Value("${sqs.payment.queue.url:}")
    private String paymentQueueUrl;

    public String getPaymentQueueUrl() {
        return paymentQueueUrl;
    }
}
