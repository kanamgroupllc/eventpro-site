package com.accessplus.eventpro.api.notification.service;

import com.accessplus.eventpro.api.notification.dto.UserNotificationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserNotificationService {

    /**
     * Persist an in-app notification for a user (creates notification + user_notification row).
     */
    void storeInAppNotification(UUID userId, String title, String message, String type);

    Page<UserNotificationResponse> listByUserId(UUID userId, Pageable pageable);

    boolean markAsRead(UUID userNotificationId, UUID userId);
}
