package com.accessplus.eventpro.notification;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.sns.SnsClient;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "notifications.email.provider=log")
class NotificationSenderApplicationTests {

    @MockitoBean
    private S3Client s3Client;

    @MockitoBean
    private SecretsManagerClient secretsManagerClient;

    @MockitoBean
    private DynamoDbClient dynamoDbClient;

    @MockitoBean
    private SnsClient snsClient;

    @Test
    void contextLoads() {
    }
}
