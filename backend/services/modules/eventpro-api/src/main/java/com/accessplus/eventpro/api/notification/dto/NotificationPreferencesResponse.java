package com.accessplus.eventpro.api.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferencesResponse {

    private boolean emailEnabled;
    private boolean smsEnabled;
    private boolean pushEnabled; // in-app when push not implemented
}
