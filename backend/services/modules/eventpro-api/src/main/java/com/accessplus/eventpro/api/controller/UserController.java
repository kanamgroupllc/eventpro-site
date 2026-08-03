package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.apikey.service.ApiKeyService;
import com.accessplus.eventpro.api.dto.ApiKeyResponse;
import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.CreateApiKeyRequest;
import com.accessplus.eventpro.api.dto.FollowedOrganizerResponse;
import com.accessplus.eventpro.api.dto.OrganizerPublicProfileResponse;
import com.accessplus.eventpro.api.dto.PromoteUserRequest;
import com.accessplus.eventpro.api.dto.UpdateUserRequest;
import com.accessplus.eventpro.api.dto.UpgradeSubscriptionRequest;
import com.accessplus.eventpro.api.dto.UserResponse;
import com.accessplus.eventpro.api.follow.service.OrganizerFollowService;
import com.accessplus.eventpro.api.service.VerificationService;
import com.accessplus.eventpro.core.security.JwtUtils;
import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.accessplus.eventpro.core.user.service.UserService;
import com.accessplus.eventpro.event.service.AWSS3ImageService;
import com.accessplus.eventpro.shared.exception.ValidationException;
import org.springframework.security.access.AccessDeniedException;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User management API")
@SecurityRequirement(name = "bearerAuth")
public class UserController extends BaseController {

    private final UserService userService;
    private final AWSS3ImageService imageService;
    private final ApiKeyService apiKeyService;
    private final OrganizerFollowService organizerFollowService;
    private final VerificationService verificationService;

    private void requireEnterprise() {
        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity user = userService.getUserById(userId);
        String tier = user.getSubscriptionTier() != null ? user.getSubscriptionTier().toUpperCase() : "BASIC";
        if (!"ENTERPRISE".equals(tier)) {
            throw new AccessDeniedException("API access is available on Enterprise plan only.");
        }
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", description = "Returns the profile of the currently authenticated user.")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        log.debug("Getting current user profile");

        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity user = userService.getUserById(userId);
        UserResponse response = UserResponse.fromEntity(user);
        if ("REJECTED".equals(user.getVerificationStatus())) {
            response.setRejectionReason(
                    verificationService.getStatus(userId).getLastRejectionReason());
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/me/following")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List followed organizers", description = "Returns organizers the current user follows.")
    public ResponseEntity<ApiResponse<List<FollowedOrganizerResponse>>> getFollowing() {
        UUID userId = JwtUtils.getCurrentUserId();
        List<FollowedOrganizerResponse> list = organizerFollowService.getFollowedOrganizersWithDetails(userId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/me/following/{organizerId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Follow organizer", description = "Follow an organizer to see their events in your Following list.")
    public ResponseEntity<ApiResponse<Void>> followOrganizer(@PathVariable UUID organizerId) {
        UUID userId = JwtUtils.getCurrentUserId();
        organizerFollowService.follow(userId, organizerId);
        return ResponseEntity.ok(ApiResponse.success(null, "Following."));
    }

    @DeleteMapping("/me/following/{organizerId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Unfollow organizer", description = "Stop following an organizer.")
    public ResponseEntity<ApiResponse<Void>> unfollowOrganizer(@PathVariable UUID organizerId) {
        UUID userId = JwtUtils.getCurrentUserId();
        organizerFollowService.unfollow(userId, organizerId);
        return ResponseEntity.ok(ApiResponse.success(null, "Unfollowed."));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current user profile", description = "Updates the profile of the currently authenticated user")
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUser(
            @Valid @RequestBody UpdateUserRequest request) {
        log.debug("Updating current user profile");

        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity currentUser = userService.getUserById(userId);
        String tier = currentUser.getSubscriptionTier() != null ? currentUser.getSubscriptionTier().toUpperCase() : "BASIC";
        // White-label branding (logo, primary color, hide platform) is Enterprise only per pricing page
        String brandingLogoUrl = "ENTERPRISE".equals(tier) ? request.getBrandingLogoUrl() : null;
        String brandingPrimaryColor = "ENTERPRISE".equals(tier) ? request.getBrandingPrimaryColor() : null;
        Boolean brandingHidePlatform = "ENTERPRISE".equals(tier) ? request.getBrandingHidePlatform() : null;

        UserEntity updatedUser = userService.updateUserProfile(
                userId,
                request.getFirstName(),
                request.getLastName(),
                request.getPhoneNumber(),
                request.getBio(),
                request.getLocation(),
                null, // profilePictureUrl is updated via separate endpoint
                request.getCulturalNiche(),
                brandingLogoUrl,
                brandingPrimaryColor,
                brandingHidePlatform
        );
        UserResponse response = UserResponse.fromEntity(updatedUser);

        return ResponseEntity.ok(ApiResponse.success(response, "Profile updated successfully"));
    }

    @PostMapping("/me/api-keys")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create API key (Enterprise)", description = "Creates an API key for programmatic access. Enterprise only. The key is shown once in the response.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createApiKey(@Valid @RequestBody CreateApiKeyRequest request) {
        requireEnterprise();
        UUID userId = JwtUtils.getCurrentUserId();
        ApiKeyService.CreateApiKeyResult result = apiKeyService.createKey(userId, request.getName());
        Map<String, Object> data = new HashMap<>();
        data.put("id", result.id());
        data.put("name", result.name());
        data.put("keyPrefix", result.keyPrefix());
        data.put("key", result.key());
        return ResponseEntity.ok(ApiResponse.success(data, "API key created. Store the key securely; it will not be shown again."));
    }

    @GetMapping("/me/api-keys")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List API keys (Enterprise)", description = "Returns API keys for the current user (key values are not returned). Enterprise only.")
    public ResponseEntity<ApiResponse<java.util.List<ApiKeyResponse>>> listApiKeys() {
        requireEnterprise();
        UUID userId = JwtUtils.getCurrentUserId();
        var keys = apiKeyService.listKeys(userId).stream().map(ApiKeyResponse::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.success(keys));
    }

    @DeleteMapping("/me/api-keys/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Revoke API key (Enterprise)", description = "Revokes an API key. Enterprise only.")
    public ResponseEntity<ApiResponse<Void>> revokeApiKey(@PathVariable UUID id) {
        requireEnterprise();
        UUID userId = JwtUtils.getCurrentUserId();
        apiKeyService.revoke(id, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "API key revoked"));
    }

    @PutMapping("/me/subscription-tier")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upgrade subscription", description = "Upgrades the current user's plan to Pro or Enterprise. Only allows upgrading (Basic → Pro → Enterprise).")
    public ResponseEntity<ApiResponse<UserResponse>> upgradeSubscription(
            @Valid @RequestBody UpgradeSubscriptionRequest request) {
        UUID userId = JwtUtils.getCurrentUserId();
        try {
            UserEntity updated = userService.updateSubscriptionTier(userId, request.getTier().trim().toUpperCase());
            UserResponse response = UserResponse.fromEntity(updated);
            return ResponseEntity.ok(ApiResponse.success(response, "Plan updated to " + request.getTier() + "."));
        } catch (IllegalArgumentException e) {
            throw new ValidationException(e.getMessage());
        }
    }

    @PostMapping("/upload-profile-picture")
    @Operation(summary = "Upload profile picture", description = "Uploads a profile picture for the current user")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadProfilePicture(
            @RequestParam("image") MultipartFile imageFile) {
        log.debug("Uploading profile picture");

        UUID userId = JwtUtils.getCurrentUserId();
        UserEntity user = userService.getUserById(userId);

        try {
            imageService.validateImage(imageFile);

            String imageKey = String.format("profile-pictures/%s/%s",
                    user.getId(),
                    imageFile.getOriginalFilename() != null ?
                            imageFile.getOriginalFilename() : "profile.jpg");

            String imageUrl = imageService.uploadImage(imageFile, imageKey);

            userService.updateUserProfile(
                    userId,
                    null, null, null, // firstName, lastName, phoneNumber
                    null, null, imageUrl // bio, location, profilePictureUrl
            );

            Map<String, String> response = new HashMap<>();
            response.put("url", imageUrl);

            log.info("Profile picture uploaded successfully: userId={}, url={}", user.getId(), imageUrl);
            return ResponseEntity.ok(ApiResponse.success(response, "Profile picture uploaded successfully"));

        } catch (IOException e) {
            log.error("Failed to upload profile picture: {}", e.getMessage(), e);
            throw new ValidationException("Failed to upload profile picture: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/public-profile")
    @Operation(summary = "Get organizer public profile", description = "Returns display-only profile (name, photo) for an organizer. Public; used to show organizer on event pages.")
    public ResponseEntity<ApiResponse<OrganizerPublicProfileResponse>> getOrganizerPublicProfile(@PathVariable UUID id) {
        log.debug("Getting public profile for user: {}", id);
        UserEntity user = userService.getUserById(id);
        OrganizerPublicProfileResponse response = OrganizerPublicProfileResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .build();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get user by ID", description = "Returns user profile by ID (admin only)")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
        log.debug("Getting user by ID: {}", id);

        UserEntity user = userService.getUserById(id);
        UserResponse response = UserResponse.fromEntity(user);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all users", description = "Returns paginated list of all users (admin only)")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "email") String sortBy,
            @RequestParam(defaultValue = "asc") String dir) {
        log.debug("Getting all users: page={}, size={}, sortBy={}, dir={}", page, size, sortBy, dir);

        int pageIndex = page > 0 ? page - 1 : 0;
        Sort.Direction direction = "desc".equalsIgnoreCase(dir)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(pageIndex, size, Sort.by(direction, sortBy));

        Page<UserEntity> userPage = userService.getAllUsers(pageable);
        Page<UserResponse> responsePage = userPage.map(UserResponse::fromEntity);

        return ResponseEntity.ok(ApiResponse.success(responsePage));
    }

    @PostMapping("/admin/users/{userId}/promote")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Promote user to ORGANIZER",
               description = "Promotes a user to ORGANIZER role. Users can only be promoted to ORGANIZER.")
    public ResponseEntity<ApiResponse<String>> promoteUser(
            @PathVariable UUID userId,
            @Valid @RequestBody PromoteUserRequest request) {
        log.debug("Promoting user: userId={}, targetRole={}", userId, request.getTargetRole());

        if (!"ORGANIZER".equalsIgnoreCase(request.getTargetRole())) {
            throw new ValidationException("Users can only be promoted to ORGANIZER role.");
        }

        userService.updateUserRole(userId, "ORGANIZER");

        return ResponseEntity.ok(ApiResponse.success("User promoted to ORGANIZER role successfully"));
    }
}
