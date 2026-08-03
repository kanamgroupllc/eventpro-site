package com.accessplus.eventpro.notification.service.impl;

import com.accessplus.eventpro.notification.service.SMSService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;
import software.amazon.awssdk.services.sns.model.SnsException;

@Service
public class SMSServiceImpl implements SMSService {

    private static final Logger LOG = LoggerFactory.getLogger(SMSServiceImpl.class);

    private final SnsClient snsClient;

    public SMSServiceImpl(SnsClient snsClient) {
        this.snsClient = snsClient;
    }

    @Override
    public void sendSMS(String phoneNumber, String message) {
        LOG.debug("Sending SMS to: {}", phoneNumber);

        try {
            PublishRequest publishRequest = PublishRequest.builder()
                    .phoneNumber(phoneNumber)
                    .message(message)
                    .build();

            snsClient.publish(publishRequest);
            LOG.info("SMS sent successfully to: {}", phoneNumber);
        } catch (SnsException e) {
            LOG.error("Failed to send SMS to {}: {}", phoneNumber, e.getMessage(), e);
            throw new RuntimeException("Failed to send SMS: " + e.getMessage(), e);
        }
    }
}
