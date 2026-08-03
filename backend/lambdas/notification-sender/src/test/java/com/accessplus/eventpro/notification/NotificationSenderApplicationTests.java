package com.accessplus.eventpro.notification;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.sns.SnsClient;

@SpringBootTest
@ActiveProfiles("test")
class NotificationSenderApplicationTests {

    @MockitoBean
    private SesClient sesClient;

    @MockitoBean
    private SnsClient snsClient;

    @Test
    void contextLoads() {
    }
}
