package com.accessplus.eventpro.api.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationResponse {

    private UUID id;
    private UUID notificationId;
    private String title;
    private String message;
    private String type;
    private String status; // UNREAD, READ
    private Instant readAt;
    private Instant createdAt;
}
