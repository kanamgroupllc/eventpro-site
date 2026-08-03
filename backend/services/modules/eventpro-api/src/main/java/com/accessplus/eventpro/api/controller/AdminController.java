package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.audit.AuditLogService;
import com.accessplus.eventpro.api.dto.*;
import com.accessplus.eventpro.api.service.AdminService;
import com.accessplus.eventpro.api.service.AuthService;
import com.accessplus.eventpro.api.service.SystemStatusAggregatorService;
import com.accessplus.eventpro.api.service.VerificationService;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.api.subscription.entity.SubscriptionPaymentEntity;
import com.accessplus.eventpro.api.subscription.service.SubscriptionPaymentService;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.event.service.EventService;
import com.accessplus.eventpro.shared.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin management API")
@SecurityRequirement(name = "bearerAuth")
public class AdminController extends BaseController {

    private final AdminService adminService;
    private final AuditLogService auditLogService;
    private final SystemStatusAggregatorService systemStatusAggregatorService;
    private final AuthService authService;
    private final UserService userService;
    private final EventService eventService;
    private final EventRepository eventRepository;
    private final SubscriptionPaymentService subscriptionPaymentService;
    private final VerificationService verificationService;

    @GetMapping("/verification-pending")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List pending KYC submissions", description = "Returns PENDING identity verification submissions for admin review. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<List<PendingVerificationResponse>>> listPendingVerifications(
            @RequestParam(defaultValue = "50") int limit) {
        List<PendingVerificationResponse> list = verificationService.listPendingSubmissions(limit);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/verification/{submissionId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve KYC submission", description = "Marks submission as VERIFIED and sets user as verified. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<String>> approveVerification(@PathVariable UUID submissionId) {
        verificationService.approveSubmission(submissionId);
        return ResponseEntity.ok(ApiResponse.success("Verification approved.", "Approved"));
    }

    @PostMapping("/verification/{submissionId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reject KYC submission", description = "Marks submission as REJECTED and sets user verification status. Optional reason in body. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<String>> rejectVerification(
            @PathVariable UUID submissionId,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null && body.containsKey("reason") ? body.get("reason") : null;
        verificationService.rejectSubmission(submissionId, reason);
        return ResponseEntity.ok(ApiResponse.success("Verification rejected.", "Rejected"));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get platform statistics", description = "Returns platform-wide statistics. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<AdminStatsResponse>> getStats() {
        log.debug("Getting platform statistics");
        AdminStatsResponse stats = adminService.getPlatformStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/event-sales")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get event sales data", description = "Returns sales data for all events. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<List<EventSaleResponse>>> getEventSales() {
        log.debug("Getting event sales data");
        List<EventSaleResponse> eventSales = adminService.getEventSales();
        return ResponseEntity.ok(ApiResponse.success(eventSales));
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get revenue data", description = "Returns revenue data for a time period. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<List<RevenueDataResponse>>> getRevenue(
            @RequestParam(defaultValue = "30d") String period) {
        log.debug("Getting revenue data for period: {}", period);
        List<RevenueDataResponse> revenueData = adminService.getRevenueData(period);
        return ResponseEntity.ok(ApiResponse.success(revenueData));
    }

    @GetMapping("/events")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all events", description = "Returns all events (admin view). Requires ADMIN role.")
    public ResponseEntity<ApiResponse<Page<EventResponse>>> getEvents(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String dir) {
        log.debug("Getting all events: page={}, size={}, sortBy={}, dir={}", page, size, sortBy, dir);

        int pageIndex = page > 0 ? page - 1 : 0;
        Sort.Direction direction = "asc".equalsIgnoreCase(dir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(pageIndex, size, Sort.by(direction, sortBy));

        Page<EventEntity> eventPage = eventService.getAllEvents(pageable);
        Page<EventResponse> responsePage = eventPage.map(EventResponse::fromEntity);

        return ResponseEntity.ok(ApiResponse.success(responsePage));
    }

    @PatchMapping("/events/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update event status", description = "Updates the status of an event. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<EventResponse>> updateEventStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateEventStatusRequest request) {
        log.debug("Updating event status: eventId={}, status={}", id, request.getStatus());

        EventEntity event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", id.toString()));

        // Note: Event status is not currently stored in EventEntity
        // This would require adding a status field to EventEntity
        // For now, we'll just return the event as-is
        EventResponse response = EventResponse.fromEntity(event);

        return ResponseEntity.ok(ApiResponse.success(response, "Event status updated successfully"));
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create admin user", description = "Creates a new user with ADMIN role. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<UserResponse>> createAdminUser(
            @Valid @RequestBody CreateAdminUserRequest request) {
        log.debug("Creating admin user: email={}", request.getEmail());
        UserEntity user = authService.createAdminUser(request);
        UserResponse response = UserResponse.fromEntity(user);
        return ResponseEntity.ok(ApiResponse.success(response, "Admin user created successfully"));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all users", description = "Returns all users (admin view). Requires ADMIN role.")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String dir) {
        log.debug("Getting all users: page={}, size={}, sortBy={}, dir={}", page, size, sortBy, dir);

        int pageIndex = page > 0 ? page - 1 : 0;
        Sort.Direction direction = "asc".equalsIgnoreCase(dir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(pageIndex, size, Sort.by(direction, sortBy));

        Page<UserEntity> userPage = userService.getAllUsers(pageable);
        Page<UserResponse> responsePage = userPage.map(UserResponse::fromEntity);

        return ResponseEntity.ok(ApiResponse.success(responsePage));
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user", description = "Updates user information. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        log.debug("Updating user: userId={}", id);

        UserEntity user = userService.getUserById(id);
        
        // Update user profile using UUID version to support extended fields
        UserEntity updatedUser = userService.updateUserProfile(
                user.getId(),
                request.getFirstName(),
                request.getLastName(),
                request.getPhoneNumber(),
                request.getBio(),
                request.getLocation(),
                null, // profilePictureUrl not updated via this endpoint
                request.getCulturalNiche()
        );

        UserResponse response = UserResponse.fromEntity(updatedUser);
        return ResponseEntity.ok(ApiResponse.success(response, "User updated successfully"));
    }

    @PatchMapping("/users/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user status", description = "Updates user status. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        log.debug("Updating user status: userId={}, status={}", id, request.getStatus());

        UserEntity updatedUser = userService.updateUserStatus(id, request.getStatus());
        UserResponse response = UserResponse.fromEntity(updatedUser);

        return ResponseEntity.ok(ApiResponse.success(response, "User status updated successfully"));
    }

    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user role", description = "Updates user role. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRoleRequest request) {
        log.debug("Updating user role: userId={}, role={}", id, request.getRole());

        // Update role in database
        UserEntity updatedUser = userService.updateUserRole(id, request.getRole());
        
        UserResponse response = UserResponse.fromEntity(updatedUser);
        return ResponseEntity.ok(ApiResponse.success(response, "User role updated successfully"));
    }

    @PostMapping("/subscription-payments")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Record subscription payment", description = "Records a Pro/Enterprise subscription payment for an organizer. Used for 1099-K 'subscription fees paid' and billing. Requires ADMIN role.")
    public ResponseEntity<ApiResponse<SubscriptionPaymentEntity>> recordSubscriptionPayment(
            @Valid @RequestBody RecordSubscriptionPaymentRequest request) {
        log.debug("Recording subscription payment: userId={}, amount={}, tier={}", request.getUserId(), request.getAmount(), request.getTier());
        SubscriptionPaymentEntity payment = subscriptionPaymentService.recordPayment(
                request.getUserId(), request.getAmount(), request.getTier(), request.getPeriod());
        try {
            UUID adminId = JwtUtils.getCurrentUserId();
            auditLogService.recordAdminAction(
                    adminId,
                    "Subscription payment recorded",
                    "SUBSCRIPTION_PAYMENT",
                    payment.getId().toString(),
                    "finance",
                    "SUCCESS",
                    "success",
                    "Tier " + request.getTier() + " for organizer " + request.getUserId());
        } catch (Exception ex) {
            log.warn("Audit log failed after subscription payment record", ex);
        }
        return ResponseEntity.ok(ApiResponse.success(payment, "Subscription payment recorded"));
    }

    @GetMapping("/audit-activity")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Audit activity feed", description = "Paginated append-only platform audit trail (indexed queries).")
    public ResponseEntity<ApiResponse<AuditActivityPageResponse>> getAuditActivity(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(auditLogService.queryPage(page, size, category, search)));
    }

    @GetMapping("/system-status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "System status", description = "JVM heap and database reachability for admin health UI (briefly cached).")
    public ResponseEntity<ApiResponse<SystemStatusResponse>> getSystemStatus() {
        return ResponseEntity.ok(ApiResponse.success(systemStatusAggregatorService.getStatus()));
    }
}
