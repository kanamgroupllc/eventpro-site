package com.accessplus.eventpro.notification.service;

public interface EmailService {

    void sendEmail(String to, String subject, String htmlBody, String textBody);
}
