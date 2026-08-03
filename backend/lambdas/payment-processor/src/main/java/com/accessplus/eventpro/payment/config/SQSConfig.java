package com.accessplus.eventpro.payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SQSConfig {

    @Value("${sqs.notification.queue.url:}")
    private String notificationQueueUrl;

    public String getNotificationQueueUrl() {
        return notificationQueueUrl;
    }
}
