package com.accessplus.eventpro.order.config;

import com.accessplus.eventpro.order.service.OrderProcessorService;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.function.Consumer;

/**
 * Spring Cloud Function configuration for order processor Lambda.
 * Handler: org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest
 * Env: spring_cloud_function_definition=processOrder
 */
@Configuration
public class OrderProcessorFunctionConfig {

    @Bean
    public Consumer<SQSEvent> processOrder(OrderProcessorService orderProcessorService) {
        return event -> {
            for (SQSMessage message : event.getRecords()) {
                try {
                    orderProcessorService.processOrder(message.getBody());
                } catch (OrderProcessorService.OrderProcessingException e) {
                    throw new RuntimeException("Failed to process order message: " + message.getMessageId(), e);
                }
            }
        };
    }
}
