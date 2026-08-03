package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.notification.dto.UserNotificationResponse;
import com.accessplus.eventpro.api.notification.service.UserNotificationService;
import com.accessplus.eventpro.core.security.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/users/me/notifications")
@RequiredArgsConstructor
@Tag(name = "User notifications", description = "In-app notifications for the current user")
@SecurityRequirement(name = "bearerAuth")
public class UserNotificationController extends BaseController {

    private final UserNotificationService userNotificationService;

    @GetMapping
    @Operation(summary = "List my notifications", description = "Returns paginated in-app notifications for the current user (newest first).")
    public ResponseEntity<ApiResponse<Page<UserNotificationResponse>>> listMyNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = JwtUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, Math.min(size, 50), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserNotificationResponse> result = userNotificationService.listByUserId(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark notification as read", description = "Marks a notification as read for the current user.")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable UUID id) {
        UUID userId = JwtUtils.getCurrentUserId();
        boolean updated = userNotificationService.markAsRead(id, userId);
        if (!updated) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(null, "Marked as read"));
    }
}
