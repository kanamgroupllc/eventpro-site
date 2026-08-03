package com.accessplus.eventpro.api.health;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.Status;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.GetQueueAttributesRequest;
import software.amazon.awssdk.services.sqs.model.GetQueueAttributesResponse;
import software.amazon.awssdk.services.sqs.model.QueueAttributeName;
import software.amazon.awssdk.services.sqs.model.SqsException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SqsHealthIndicator Unit Tests")
class SqsHealthIndicatorTest {

    private static final String ORDER_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123/order-queue";
    private static final String PAYMENT_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123/payment-queue";
    private static final String NOTIFICATION_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123/notification-queue";

    @Mock
    private SqsClient sqsClient;

    @Test
    @DisplayName("Should be UP when all configured queues are reachable")
    void shouldBeUpWhenAllQueuesAreReachable() {
        when(sqsClient.getQueueAttributes(any(GetQueueAttributesRequest.class)))
                .thenReturn(GetQueueAttributesResponse.builder().build());

        Health health = healthIndicator().health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertQueueStatus(health, "order", "UP");
        assertQueueStatus(health, "payment", "UP");
        assertQueueStatus(health, "notification", "UP");

        ArgumentCaptor<GetQueueAttributesRequest> requestCaptor =
                ArgumentCaptor.forClass(GetQueueAttributesRequest.class);
        verify(sqsClient, times(3)).getQueueAttributes(requestCaptor.capture());
        assertThat(requestCaptor.getAllValues())
                .extracting(GetQueueAttributesRequest::queueUrl)
                .containsExactlyInAnyOrder(ORDER_QUEUE_URL, PAYMENT_QUEUE_URL, NOTIFICATION_QUEUE_URL);
        assertThat(requestCaptor.getAllValues())
                .allSatisfy(request -> assertThat(request.attributeNames())
                        .containsExactly(QueueAttributeName.QUEUE_ARN));
    }

    @Test
    @DisplayName("Should be DOWN when a queue URL is missing")
    void shouldBeDownWhenQueueUrlIsMissing() {
        SqsHealthIndicator healthIndicator = new SqsHealthIndicator(
                sqsClient,
                ORDER_QUEUE_URL,
                "",
                NOTIFICATION_QUEUE_URL
        );

        Health health = healthIndicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertQueueStatus(health, "payment", "DOWN");
        assertThat(queueDetails(health, "payment"))
                .containsEntry("error", "Queue URL is not configured");
        verify(sqsClient, times(2)).getQueueAttributes(any(GetQueueAttributesRequest.class));
    }

    @Test
    @DisplayName("Should be DOWN when AWS cannot read a queue")
    void shouldBeDownWhenQueueAttributesCannotBeRead() {
        when(sqsClient.getQueueAttributes(any(GetQueueAttributesRequest.class)))
                .thenReturn(GetQueueAttributesResponse.builder().build())
                .thenThrow(SqsException.builder().message("queue unavailable").build())
                .thenReturn(GetQueueAttributesResponse.builder().build());

        Health health = healthIndicator().health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertQueueStatus(health, "order", "UP");
        assertQueueStatus(health, "payment", "DOWN");
        assertQueueStatus(health, "notification", "UP");
        assertThat(queueDetails(health, "payment"))
                .containsEntry("error", "SqsException")
                .containsEntry("message", "queue unavailable");
    }

    private SqsHealthIndicator healthIndicator() {
        return new SqsHealthIndicator(sqsClient, ORDER_QUEUE_URL, PAYMENT_QUEUE_URL, NOTIFICATION_QUEUE_URL);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> queueDetails(Health health, String queueName) {
        return (Map<String, Object>) health.getDetails().get(queueName);
    }

    private void assertQueueStatus(Health health, String queueName, String status) {
        assertThat(queueDetails(health, queueName)).containsEntry("status", status);
    }
}
