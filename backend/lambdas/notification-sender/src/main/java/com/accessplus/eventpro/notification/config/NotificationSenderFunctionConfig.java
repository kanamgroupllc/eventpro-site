package com.accessplus.eventpro.notification.config;

import com.accessplus.eventpro.notification.service.NotificationSenderService;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.function.Consumer;

@Configuration
public class NotificationSenderFunctionConfig {

    @Bean
    public Consumer<SQSEvent> sendNotification(NotificationSenderService notificationSenderService) {
        return event -> {
            for (SQSMessage message : event.getRecords()) {
                try {
                    notificationSenderService.sendNotification(message.getBody());
                } catch (NotificationSenderService.NotificationProcessingException e) {
                    throw new RuntimeException("Failed to process notification message: " + message.getMessageId(), e);
                }
            }
        };
    }
}
