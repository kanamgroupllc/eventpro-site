package com.accessplus.eventpro.notification.service;

public interface SMSService {

    void sendSMS(String phoneNumber, String message);
}
