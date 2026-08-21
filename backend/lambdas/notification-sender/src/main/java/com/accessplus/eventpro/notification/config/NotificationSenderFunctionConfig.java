package com.accessplus.eventpro.notification.config;

import com.accessplus.eventpro.notification.service.NotificationSenderService;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage;
import com.amazonaws.services.lambda.runtime.events.SQSBatchResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.function.Function;

@Configuration
public class NotificationSenderFunctionConfig {

    @Bean
    public Function<SQSEvent, SQSBatchResponse> sendNotification(NotificationSenderService notificationSenderService) {
        return event -> {
            var failures = new ArrayList<SQSBatchResponse.BatchItemFailure>();
            for (SQSMessage message : event.getRecords()) {
                try {
                    notificationSenderService.sendNotification(message.getBody());
                } catch (NotificationSenderService.NotificationProcessingException e) {
                    failures.add(new SQSBatchResponse.BatchItemFailure(message.getMessageId()));
                }
            }
            return new SQSBatchResponse(failures);
        };
    }
}
