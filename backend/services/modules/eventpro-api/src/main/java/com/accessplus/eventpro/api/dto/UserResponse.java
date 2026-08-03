package com.accessplus.eventpro.api.dto;

import com.accessplus.eventpro.core.user.entity.UserEntity;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String bio;
    private String location;
    private String profilePictureUrl;
    private String status;
    private String role;
    /** Plan tier: BASIC, PRO, ENTERPRISE. Used for feature gating. */
    private String subscriptionTier;
    /** True when tax/ID and risk check passed; gates payouts for organizers. */
    private Boolean isVerified;
    /** KYC workflow: NOT_STARTED, PENDING, IN_PROGRESS, VERIFIED, REJECTED. */
    private String verificationStatus;
    /** Reason for rejection when verificationStatus is REJECTED (from last KYC submission). */
    private String rejectionReason;
    /** Risk level: LOW, MEDIUM, HIGH. */
    private String riskLevel;
    /** Organizer cultural niche / focus; feeds search taxonomy. */
    private String culturalNiche;
    /** White-label: custom logo URL (Pro/Enterprise). */
    private String brandingLogoUrl;
    /** White-label: primary color hex (Pro/Enterprise). */
    private String brandingPrimaryColor;
    /** White-label: hide platform branding on event pages (Pro/Enterprise). */
    private Boolean brandingHidePlatform;
    /** Stripe Connect account ID when bank/payout account is connected. */
    private String stripeConnectAccountId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Account flags (default to true)
    @Builder.Default
    private Boolean accountNonExpired = true;
    
    @Builder.Default
    private Boolean accountNonLocked = true;
    
    @Builder.Default
    private Boolean credentialsNonExpired = true;
    
    @Builder.Default
    private Boolean enabled = true;
    
    // Optional nested objects (to be populated in future phases)
    // private List<EventResponse> events;
    // private List<OrderResponse> orders;
    // private Set<RoleDto> roles;
    
    public static UserResponse fromEntity(UserEntity entity) {
        if (entity == null) {
            return null;
        }
        
        return UserResponse.builder()
                .id(entity.getId())
                .firstName(entity.getFirstName())
                .lastName(entity.getLastName())
                .email(entity.getEmail())
                .phoneNumber(entity.getPhoneNumber())
                .bio(entity.getBio())
                .location(entity.getLocation())
                .profilePictureUrl(entity.getProfilePictureUrl())
                .status(entity.getStatus())
                .role(entity.getRole())
                .subscriptionTier(entity.getSubscriptionTier() != null ? entity.getSubscriptionTier() : "BASIC")
                .isVerified(entity.getIsVerified() != null ? entity.getIsVerified() : false)
                .verificationStatus(entity.getVerificationStatus() != null ? entity.getVerificationStatus() : "NOT_STARTED")
                .riskLevel(entity.getRiskLevel() != null ? entity.getRiskLevel() : "LOW")
                .culturalNiche(entity.getCulturalNiche())
                .brandingLogoUrl(entity.getBrandingLogoUrl())
                .brandingPrimaryColor(entity.getBrandingPrimaryColor())
                .brandingHidePlatform(entity.getBrandingHidePlatform() != null ? entity.getBrandingHidePlatform() : false)
                .stripeConnectAccountId(entity.getStripeConnectAccountId())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .accountNonExpired(true)
                .accountNonLocked(true)
                .credentialsNonExpired(true)
                .enabled(true)
                .build();
    }
}
