package com.accessplus.eventpro.payment;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.sqs.SqsClient;

@SpringBootTest
@ActiveProfiles("test")
class PaymentProcessorApplicationTests {

    @MockitoBean
    private SqsClient sqsClient;

    @MockitoBean
    private SecretsManagerClient secretsManagerClient;

    @Test
    void contextLoads() {
    }
}
