package com.accessplus.eventpro.api.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateNotificationPreferencesRequest {

    private Boolean emailEnabled;
    private Boolean smsEnabled;
    private Boolean pushEnabled; // in-app
}
