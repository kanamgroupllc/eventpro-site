package com.accessplus.eventpro.notification.config;

import com.accessplus.eventpro.notification.service.NotificationSenderService;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class NotificationSenderFunctionConfigTest {
    @Test
    void reportsOnlyFailedRecordsForSqsPartialBatchRetry() throws Exception {
        NotificationSenderService sender = mock(NotificationSenderService.class);
        doThrow(new NotificationSenderService.NotificationProcessingException("failed", new RuntimeException()))
                .when(sender).sendNotification("bad");
        SQSEvent.SQSMessage good = new SQSEvent.SQSMessage();
        good.setMessageId("good-id");
        good.setBody("good");
        SQSEvent.SQSMessage bad = new SQSEvent.SQSMessage();
        bad.setMessageId("bad-id");
        bad.setBody("bad");
        SQSEvent event = new SQSEvent();
        event.setRecords(List.of(good, bad));

        var response = new NotificationSenderFunctionConfig().sendNotification(sender).apply(event);

        assertEquals(1, response.getBatchItemFailures().size());
        assertEquals("bad-id", response.getBatchItemFailures().getFirst().getItemIdentifier());
        verify(sender).sendNotification("good");
        verify(sender).sendNotification("bad");
    }
}
