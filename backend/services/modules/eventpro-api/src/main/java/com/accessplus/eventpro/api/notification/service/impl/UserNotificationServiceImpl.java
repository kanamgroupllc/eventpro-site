package com.accessplus.eventpro.api.notification.service.impl;

import com.accessplus.eventpro.api.notification.dto.UserNotificationResponse;
import com.accessplus.eventpro.api.notification.entity.NotificationEntity;
import com.accessplus.eventpro.api.notification.entity.UserNotificationEntity;
import com.accessplus.eventpro.api.notification.repository.NotificationRepository;
import com.accessplus.eventpro.api.notification.repository.UserNotificationRepository;
import com.accessplus.eventpro.api.notification.service.UserNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserNotificationServiceImpl implements UserNotificationService {

    private static final String DELIVERY_TYPE_IN_APP = "IN_APP";
    private static final String STATUS_UNREAD = "UNREAD";

    private final NotificationRepository notificationRepository;
    private final UserNotificationRepository userNotificationRepository;

    @Override
    @Transactional
    public void storeInAppNotification(UUID userId, String title, String message, String type) {
        NotificationEntity notification = new NotificationEntity();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setDeliveryType(DELIVERY_TYPE_IN_APP);
        notification = notificationRepository.save(notification);

        UserNotificationEntity userNotification = new UserNotificationEntity();
        userNotification.setUserId(userId);
        userNotification.setNotification(notification);
        userNotification.setStatus(STATUS_UNREAD);
        userNotificationRepository.save(userNotification);
        log.debug("Stored in-app notification for user {} type={}", userId, type);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserNotificationResponse> listByUserId(UUID userId, Pageable pageable) {
        return userNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public boolean markAsRead(UUID userNotificationId, UUID userId) {
        return userNotificationRepository.findByIdAndUserId(userNotificationId, userId)
                .map(un -> {
                    un.setStatus("READ");
                    un.setReadAt(Instant.now());
                    userNotificationRepository.save(un);
                    return true;
                })
                .orElse(false);
    }

    private UserNotificationResponse toResponse(UserNotificationEntity un) {
        NotificationEntity n = un.getNotification();
        return UserNotificationResponse.builder()
                .id(un.getId())
                .notificationId(n != null ? n.getId() : null)
                .title(n != null ? n.getTitle() : null)
                .message(n != null ? n.getMessage() : null)
                .type(n != null ? n.getType() : null)
                .status(un.getStatus())
                .readAt(un.getReadAt())
                .createdAt(un.getCreatedAt())
                .build();
    }
}
