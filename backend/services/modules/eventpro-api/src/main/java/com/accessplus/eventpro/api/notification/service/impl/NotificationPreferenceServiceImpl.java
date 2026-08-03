package com.accessplus.eventpro.api.notification.service.impl;

import com.accessplus.eventpro.api.notification.dto.NotificationPreferencesResponse;
import com.accessplus.eventpro.api.notification.dto.UpdateNotificationPreferencesRequest;
import com.accessplus.eventpro.api.notification.entity.NotificationPreferenceEntity;
import com.accessplus.eventpro.api.notification.repository.NotificationPreferenceRepository;
import com.accessplus.eventpro.api.notification.service.NotificationPreferenceService;
import com.accessplus.eventpro.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationPreferenceServiceImpl implements NotificationPreferenceService {

    private final NotificationPreferenceRepository notificationPreferenceRepository;

    @Override
    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getByUserId(UUID userId) {
        return notificationPreferenceRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseGet(this::defaultResponse);
    }

    @Override
    @Transactional
    public NotificationPreferencesResponse update(UUID userId, UpdateNotificationPreferencesRequest request) {
        NotificationPreferenceEntity entity = notificationPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    NotificationPreferenceEntity e = new NotificationPreferenceEntity();
                    e.setUserId(userId);
                    return e;
                });
        if (request.getEmailEnabled() != null) entity.setEmailEnabled(request.getEmailEnabled());
        if (request.getSmsEnabled() != null) entity.setSmsEnabled(request.getSmsEnabled());
        if (request.getPushEnabled() != null) entity.setPushEnabled(request.getPushEnabled());
        if (!entity.isEmailEnabled() && !entity.isSmsEnabled() && !entity.isPushEnabled()) {
            throw new ValidationException("At least one notification channel must be enabled.");
        }
        entity = notificationPreferenceRepository.save(entity);
        return toResponse(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isInAppEnabled(UUID userId) {
        return notificationPreferenceRepository.findByUserId(userId)
                .map(NotificationPreferenceEntity::isPushEnabled)
                .orElse(true); // default allow in-app when no preferences row
    }

    private NotificationPreferencesResponse toResponse(NotificationPreferenceEntity e) {
        return NotificationPreferencesResponse.builder()
                .emailEnabled(e.isEmailEnabled())
                .smsEnabled(e.isSmsEnabled())
                .pushEnabled(e.isPushEnabled())
                .build();
    }

    private NotificationPreferencesResponse defaultResponse() {
        return NotificationPreferencesResponse.builder()
                .emailEnabled(true)
                .smsEnabled(true)
                .pushEnabled(true)
                .build();
    }
}
