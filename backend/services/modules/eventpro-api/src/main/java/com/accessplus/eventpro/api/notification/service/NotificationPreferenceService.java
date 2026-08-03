package com.accessplus.eventpro.api.notification.service;

import com.accessplus.eventpro.api.notification.dto.NotificationPreferencesResponse;
import com.accessplus.eventpro.api.notification.dto.UpdateNotificationPreferencesRequest;

import java.util.UUID;

public interface NotificationPreferenceService {

    NotificationPreferencesResponse getByUserId(UUID userId);

    NotificationPreferencesResponse update(UUID userId, UpdateNotificationPreferencesRequest request);

    /**
     * Returns true if in-app notifications are enabled for the user (uses push_enabled column).
     */
    boolean isInAppEnabled(UUID userId);
}
