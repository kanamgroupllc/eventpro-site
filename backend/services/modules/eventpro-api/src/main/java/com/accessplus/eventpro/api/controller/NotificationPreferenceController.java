package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.notification.dto.NotificationPreferencesResponse;
import com.accessplus.eventpro.api.notification.dto.UpdateNotificationPreferencesRequest;
import com.accessplus.eventpro.api.notification.service.NotificationPreferenceService;
import com.accessplus.eventpro.core.security.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/users/me/notification-preferences")
@RequiredArgsConstructor
@Tag(name = "Notification preferences", description = "User notification channel preferences (email, SMS, in-app)")
@SecurityRequirement(name = "bearerAuth")
public class NotificationPreferenceController extends BaseController {

    private final NotificationPreferenceService notificationPreferenceService;

    @GetMapping
    @Operation(summary = "Get my notification preferences", description = "Returns the current user's notification preferences. Defaults to all enabled if no row exists.")
    public ResponseEntity<ApiResponse<NotificationPreferencesResponse>> getMyPreferences() {
        UUID userId = JwtUtils.getCurrentUserId();
        NotificationPreferencesResponse response = notificationPreferenceService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping
    @Operation(summary = "Update my notification preferences", description = "Updates the current user's notification preferences. At least one channel must remain enabled.")
    public ResponseEntity<ApiResponse<NotificationPreferencesResponse>> updateMyPreferences(
            @Valid @RequestBody UpdateNotificationPreferencesRequest request) {
        UUID userId = JwtUtils.getCurrentUserId();
        NotificationPreferencesResponse response = notificationPreferenceService.update(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
