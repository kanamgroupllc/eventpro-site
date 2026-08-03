package com.accessplus.eventpro.notification.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SESConfig {

    @Value("${ses.sender.email:noreply@kanamevents.com}")
    private String senderEmail;

    public String getSenderEmail() {
        return senderEmail;
    }
}
