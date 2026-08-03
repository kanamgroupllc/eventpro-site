package com.accessplus.eventpro.api.health;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.GetQueueAttributesRequest;
import software.amazon.awssdk.services.sqs.model.QueueAttributeName;

import java.util.LinkedHashMap;
import java.util.Map;

@Component("sqsHealthIndicator")
public class SqsHealthIndicator implements HealthIndicator {

    private final SqsClient sqsClient;
    private final Map<String, String> queueUrls;

    public SqsHealthIndicator(
            SqsClient sqsClient,
            @Value("${aws.sqs.orderQueueUrl:}") String orderQueueUrl,
            @Value("${aws.sqs.paymentQueueUrl:}") String paymentQueueUrl,
            @Value("${aws.sqs.notificationQueueUrl:}") String notificationQueueUrl) {
        this.sqsClient = sqsClient;
        this.queueUrls = new LinkedHashMap<>();
        this.queueUrls.put("order", orderQueueUrl);
        this.queueUrls.put("payment", paymentQueueUrl);
        this.queueUrls.put("notification", notificationQueueUrl);
    }

    @Override
    public Health health() {
        Map<String, Object> details = new LinkedHashMap<>();
        boolean healthy = true;

        for (Map.Entry<String, String> queue : queueUrls.entrySet()) {
            Map<String, Object> queueDetails = checkQueue(queue.getValue());
            details.put(queue.getKey(), queueDetails);

            if (!"UP".equals(queueDetails.get("status"))) {
                healthy = false;
            }
        }

        Health.Builder builder = healthy ? Health.up() : Health.down();
        return builder.withDetails(details).build();
    }

    private Map<String, Object> checkQueue(String queueUrl) {
        Map<String, Object> details = new LinkedHashMap<>();

        if (!StringUtils.hasText(queueUrl)) {
            details.put("status", "DOWN");
            details.put("error", "Queue URL is not configured");
            return details;
        }

        try {
            sqsClient.getQueueAttributes(GetQueueAttributesRequest.builder()
                    .queueUrl(queueUrl)
                    .attributeNames(QueueAttributeName.QUEUE_ARN)
                    .build());
            details.put("status", "UP");
        } catch (Exception e) {
            details.put("status", "DOWN");
            details.put("error", e.getClass().getSimpleName());
            details.put("message", e.getMessage());
        }

        return details;
    }
}
