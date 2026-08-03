package com.accessplus.eventpro.payment.config;

import com.accessplus.eventpro.payment.service.PaymentProcessorService;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.function.Consumer;

@Configuration
public class PaymentProcessorFunctionConfig {

    @Bean
    public Consumer<SQSEvent> processPayment(PaymentProcessorService paymentProcessorService) {
        return event -> {
            for (SQSMessage message : event.getRecords()) {
                try {
                    paymentProcessorService.processPayment(message.getBody());
                } catch (PaymentProcessorService.PaymentProcessingException e) {
                    throw new RuntimeException("Failed to process payment message: " + message.getMessageId(), e);
                }
            }
        };
    }
}
